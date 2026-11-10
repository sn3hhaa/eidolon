# EIDOLON — Technical Notes

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 8, TypeScript 7 (strict) |
| Rendering | Three.js r187, `WebGLRenderer` (WebGL 2) |
| Shading | Hand-written GLSL in `ShaderMaterial`s (template strings in `.ts`) |
| Easing | GSAP 3 — `gsap.parseEase` only (see *Determinism*) |
| Post | `three/addons` `EffectComposer`, `ShaderPass`, `UnrealBloomPass` + custom passes |
| Capture | Playwright driving a headless Chromium-family browser |
| Encode | FFmpeg (libx264), verified with ffprobe |

## Architecture

```
index.html              bare canvas + (dev only) transport bar
src/
  main.ts               boot, URL params, window.__eidolon automation API
  film.ts               THE master timeline: 9 scenes, 8 transitions
  engine/
    Film.ts             absolute-time renderer: renderFrame(n)
    types.ts            FilmScene / SceneLook / transition contracts
    Track.ts            pure keyframe tracks (GSAP eases)
    CameraRig.ts        spline camera: position path, target path, fov, roll
    PostPipeline.ts     composite → Kuwahara → bloom → finish
    PendingScene.ts     black stand-in for unbuilt scenes
    glsl.ts             shared noise + accent palette GLSL
    rng.ts              seeded PRNG (mulberry32)
  scenes/
    s01-awakening/      AwakeningScene + shards / burst / particles / uniforms
  dev/DevUI.ts          transport (DOM, never drawn into the film)
scripts/render.mjs      offline renderer (stills, frame sequence, MP4)
```

## Determinism

The single rule the engine is built around:

> **`film.renderFrame(n)` is a pure function of `n`.**

- Time is `t = n / 30`. There is no clock, `requestAnimationFrame` delta, or
  accumulated state anywhere in scene code.
- A scene implements `render(tLocal, target, ctx)`; `tLocal` is seconds since the
  scene's start. It must give the same image no matter which frame was drawn
  before it.
- All animation is closed-form:
  - **Tracks** (`Track.ts`) — keyframed scalars evaluated at `t`. GSAP is used
    only as an easing library (`gsap.parseEase('expo.out')` etc.). No tweens or
    tickers are created, because a tween's value depends on when it was started
    and how it was seeked.
  - **Camera** (`CameraRig.ts`) — arc-length-parameterised Catmull-Rom splines
    for position and look-at; progress, FOV and roll are Tracks; a small
    sum-of-sines drift keeps it alive.
  - **Particles** — positions are computed in the vertex shader from per-particle
    seeds and a time uniform (e.g. embers: `dir * speed * (15(1 − e^(−1.5·age)) + 0.9·age)`).
    Nothing is integrated frame to frame.
- Randomness: a seeded `Rng` at build time, hash functions in GLSL at run time.
  `Math.random` is not used.
- Film grain is seeded by frame number, so it changes every frame but frame `n`
  always has the same grain.
- The dev transport advances a playhead with wall-clock time but only ever
  displays `renderFrame(floor(playhead·30))` — the preview *is* the export.

Scope of the guarantee: identical frames on the same machine/browser/GPU driver.
Different GPUs can differ in low-order bits (float precision in noise), which is
normal for GLSL.

## Scenes and transitions

`src/film.ts` lists every scene with `start`/`end` and every transition with its
own `start`/`end`, `kind` and the visual motif it is built on. `Film.resolve(t)`
returns the scene(s) on screen:

- outside a transition: one scene → rendered into HDR target A.
- inside a transition: outgoing scene → target A, incoming → target B, mixed by
  the composite pass; their `SceneLook`s (exposure, bloom, grain …) are
  interpolated with the same factor.

Transition kinds so far: `dissolve`, and `luma` (the incoming image arrives
through the brightest parts of the outgoing one, so a light source can "become"
the next scene). Each planned transition also depends on a *match*: the outgoing
scene ends on a shape the incoming scene begins with (Scene 01 ends on a moon
disc for exactly this reason). Bespoke transition shaders will be added alongside
the scenes that need them.

Unbuilt scenes are `PendingScene`s that clear to black and report `built: false`;
the dev UI and the render script both announce them.

## Render pipeline

1. Each scene draws into a `HalfFloat` render target (linear HDR, 4× MSAA, depth).
2. **Composite** — picks/mixes scene targets.
3. **Kuwahara** (optional per scene) — 4-quadrant mean/variance filter, radius in
   pixels at 1080p scaled with resolution; variance is measured on `c/(1+c)` so HDR
   highlights do not dominate. Gives geometry a dabbed-paint surface.
4. **Bloom** — `UnrealBloomPass`, thresholded at ≥ 1.0 so only true HDR
   highlights glow.
5. **Finish** — radial chromatic aberration, exposure, saturation, a highlight
   shoulder that is exactly linear below 0.62 (mid-tone colours are not shifted),
   vignette, sRGB encode, contrast, static paper tooth, per-frame grain. Tooth and
   grain scale with luminance so black stays black.

`renderer.outputColorSpace` is linear; the finish pass does the only sRGB encode.

## Scene 01 shaders

- **Fragments** (`shards.ts`) — 48 instanced quads. The fragment shader builds a
  domain-warped FBM island (`m > 0` inside), antialiased with `fwidth` +
  alpha-to-coverage. Interior: anisotropic FBM along a flow angle → soft gouache
  washes broken by bristle noise. Rim: a variable-width band filled with two
  octaves of inverted Worley "lumps", cel-stepped into five tones, coloured by a
  cool ramp (slate → grey → cream) or hot ramp (burnt orange → gold → cream)
  depending on how much burst light reaches it. Light direction test uses the
  **analytic** gradient of the silhouette field (finite differences on the noise),
  rotated into world space.
- **Core / rays / moon** (`burst.ts`) — one camera-facing quad. Polar-coordinate
  ray layers: the angle is divided into N slots; each slot hashes to
  on/off, length, width, two colours and a jitter. Width is measured in world
  units from the slot's axis so needles stay thin at any radius. The core disc
  writes coverage to alpha and the material blends `(ONE, ONE_MINUS_SRC_ALPHA)`:
  additive everywhere, opaque where the moon is.
- **3D rays** — instanced strips billboarded around their own axis
  (`side = cross(dir, toCamera)`), faded near the lens.
- **Particles** (`particles.ts`) — `THREE.Points`; sprites sized in world units
  (`size · pxPerUnit / depth`); cross sparkles are two crossed exponentials.

## Bugs worth remembering

- **`pow()` with a negative base is undefined in GLSL** and produced NaNs on this
  GPU; one NaN pixel going into bloom's blur chain blacks out the entire frame.
  Interpolated varyings can also overshoot `[0,1]` at MSAA edge samples. Rule:
  square with `x*x`, clamp anything fed to `pow`.
- **`smoothstep(a, b, x)` with `a > b` is undefined** — write `1.0 - smoothstep(b, a, x)`.
- A halo whose radius scales with the core radius floods the whole frame once the
  camera is close; measure it from the disc's rim instead.
- Additive geometry that surrounds the camera (rays passing the lens) accumulates
  into haze; fade by distance to the camera.

## Export pipeline

`scripts/render.mjs`:

1. Starts a Vite dev server programmatically.
2. Launches a browser through Playwright — bundled Chromium if installed, else
   system Edge, else Chrome — with ANGLE/D3D11 GPU flags.
3. Opens `/?film=1&scale=S`: film mode, bare canvas, no UI.
4. For each frame `n`: `page.evaluate(() => __eidolon.captureFrame(n))` renders
   the frame and returns `canvas.toDataURL('image/png')`; Node writes
   `output/frames/frame_NNNNN.png`.
5. Any console error, page error, shader compile error or WebGL context loss
   aborts the render rather than writing broken frames.
6. `ffmpeg -framerate 30 -i frame_%05d.png -c:v libx264 -preset slow -crf 17
   -pix_fmt yuv420p -movflags +faststart`, BT.709 tagged.
7. `ffprobe -count_frames` prints codec, size, frame rate, frame count, duration.

Commands are listed in the README.

`scripts/smoke.mjs` (`npm run smoke`) opens the dev page in the same browser and
checks the transport (step, play/pause, scene jump, scrub, screenshot,
resolution switch), that film mode contains no control elements, and that five
frames hash identically when re-rendered in a different order.

## Performance (measured)

Machine: Intel UHD Graphics (integrated, `0xA78B`) via ANGLE Direct3D 11, system
Microsoft Edge driven by Playwright 1.65, Windows 11.

- Scene 01 at 1920×1080: three full renders took **99.8 s, 88.6 s and 93.8 s for
  300 frames (≈3.0–3.4 fps)** end to end (render + PNG encode + base64 transfer
  + disk write). In the first, the rate fell from 4.7 fps in the dark opening to
  ~3.0 fps once the burst filled the frame.
- Extrapolated, a full 2700-frame render at this complexity is on the order of
  15 minutes; later scenes will be heavier.
- Encode: 300 frames in ~10–13 s (x264 `slow`); 35.0 MB at CRF 17.

Real-time preview speed in the dev UI has not been measured yet.

## Known limitations

- No depth of field yet.
- Kuwahara is isotropic (not the anisotropic variant) and erases 1–2 px
  features, so it is disabled for Scene 01.
- Cross-GPU bit-exactness is not guaranteed.
- Bundled Playwright Chromium is not installed on the build machine; renders so
  far used system Edge.
