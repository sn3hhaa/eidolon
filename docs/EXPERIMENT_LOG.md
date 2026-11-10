# EIDOLON — Experiment Log

An honest, chronological record of building EIDOLON with an AI model as creative
director and engineer. Entries describe what was actually attempted and
observed. Numbers are measurements from this machine unless marked as estimates.

**Build machine:** Windows 11 · Intel UHD Graphics (integrated) · Node 26.13 ·
FFmpeg 9.0.2 · Blender **not installed**.

---

## Entry 1 — 2026-11-11 · Foundation and Scene 01 *The Awakening*

**Model:** Claude Fable 5.2 (`claude-fable-5-2`), running in Claude Code (VS Code
extension). One continuous session.

**Human input:** a single master brief (storyboard, technical requirements,
quality bar) and seven reference images. No code, no intermediate feedback during
this entry — every visual judgement below was made by the model looking at its
own rendered frames.

### Attempted

1. Inspect the repository and all references.
2. Write an art-direction analysis, storyboard and asset manifest.
3. Build a deterministic film engine and offline render pipeline.
4. Build Scene 01 completely, as the visual quality benchmark.
5. Render it, look at the frames, and fix what looked wrong.

### Tools used

Claude Code file/shell tools · Vite 8 · TypeScript 7 · Three.js r187 · GSAP 3
(eases only) · Playwright 1.65 driving system Microsoft Edge (headless, GPU via
ANGLE/D3D11) · FFmpeg/ffprobe 9.0.2. The model viewed rendered PNGs directly
(stills and ffmpeg-tiled contact sheets) to critique them.

### Starting state

- `references/` with 7 images; nothing else. The folder was not yet a git
  repository; `sn3hhaa/eidolon` existed on GitHub and was empty.
- Blender was not found on PATH → no sculpted/modelled assets; everything in this
  entry is procedural.
- Playwright's bundled Chromium was not installed; the render script fell back
  to system Edge automatically.

### Implemented

- **Engine:** absolute-time `Film.renderFrame(n)`; pure keyframe `Track`s;
  spline `CameraRig`; scene + transition contracts with two-scene compositing
  (dissolve, luma); HDR MSAA scene targets; post chain (Kuwahara → bloom → grade,
  vignette, paper tooth, grain, aberration); seeded RNG.
- **Dev transport:** play/pause, scrub, scene select, frame step, loop scene,
  preview resolution, PNG screenshot; keyboard shortcuts. DOM only — absent in
  film mode.
- **Offline renderer:** `scripts/render.mjs` — stills, frame sequences, MP4
  encode, ffprobe verification; aborts on any page/shader error.
- **Scene 01:** 48 shader-painted fragments, seed star → ring core → moon, four
  layers of needle rays, 300 3D rays + 170 dashes, shock ring, 520 cross
  sparkles, 4,200 dust motes, 2,600 embers, spline camera with a dive.
- **Timeline:** all nine scenes scheduled; 02–09 are `PendingScene` (black).

### Visual results — what the frames actually looked like, in order

| Iteration | What I saw | Verdict |
|---|---|---|
| 1 | Pre-burst frame promising (navy fragments, rims, sparkles). **Every frame after ignition was solid black.** | Broken |
| 2 | Burst visible but a huge white blob at centre, blacks lifted to brown haze by bloom, ray colours washed to pastel. Looked like a stock lens flare — precisely the "excessive bloom" the brief forbids. | Wrong identity |
| 3 | Blacks restored, needles saturated. But fragment interiors showed concentric contour lines (a topographic-map look), the shock ring was a fat rainbow hoop, the core was still a blob hiding its ring, rims were beige. | Better, still digital |
| 4 | Contours gone; warm light now soaks into fragments facing the burst. Rim lighting visibly **blocky** on large near fragments. | Close |
| 5 | Rim lighting smooth, rims cream-white with blue shadow. Final frame a milky wash; far fragments visible *through* the moon; embers ballooned into blurry confetti. | Ending broken |
| 6 | Moon opaque; radial haze gone after two more fixes; moon given maria. End frame: painted moon among gold-lit fragments on true black. | Accepted |
| 7 | Contact sheet of the full scene showed the camera nearly static for 4 s, then the whole dive in the last 12 frames. Re-timed twice (see Problems). | Accepted after re-time |
| 8 | With the new timing the disc stayed a blank white sun until the last few frames; no moon face during the hand-over to Scene 02. | Fixed (Problem 10) |

Representative accepted frames are in [`docs/media/`](media/).

**Honest assessment against reference R1.** What matches: black negative space,
compact burst of single-colour needles, cream-rimmed dark fragments turning gold
toward the light, cross sparkles, pale ovoid stones. What does not: the
reference's cloud rims are thicker, softer and more obviously *brushed* than
mine, which read slightly sculpted/rocky; the reference fragments are fewer and
larger with bolder silhouettes; and my interiors carry a faint marbled noise
pattern that a painter would not make. It reads as an illustration in the same
family, not as the same hand.

### Problems encountered → fixes

1. **Black frames after ignition.** `pow(x, 2.0)` with negative `x` (shock ring,
   core ring) is undefined in GLSL and returned NaN on this GPU; bloom's blur
   spread one NaN pixel over the whole frame. MSAA edge samples can also push
   varyings outside `[0,1]` before a `pow`. → Replaced with `x*x`, clamped every
   `pow` base. Also removed two `smoothstep` calls with reversed edges
   (undefined behaviour).
2. **Lens-flare look.** → Bloom threshold 0.9→1.0 and strength 0.42→0.2; halo
   falloff tightened (power 2.2→3.2) and the wide violet "breath" deleted; the
   summed ray layers capped at 1.7 so overlaps keep their hue; ray roots faded so
   the ring core is visible.
3. **Contour lines in fragment interiors.** Caused by quantising a smooth noise
   field into bands. → Removed the quantisation; wash edges are now broken by a
   bristle noise instead.
4. **Blocky rim light.** Edge direction came from `dFdx/dFdy`, which is constant
   per 2×2 pixel quad. → Analytic gradient of the silhouette field (two extra FBM
   taps), rotated into world space.
5. **Favicon 404 aborted the first render** because the render script treats any
   console error as fatal. → Inline empty favicon. (The strictness is deliberate
   and stays.)
6. **Moon not opaque** (additive blending). → Core writes coverage to alpha and
   blends `(ONE, ONE_MINUS_SRC_ALPHA)`.
7. **Brown haze in the end frame**, two separate causes: (a) 3D rays surrounding
   the camera once it was inside the burst → fade by distance to lens and by the
   moon factor; (b) the halo radius scaled with the core radius and flooded the
   frame → halo now measured from the disc's rim.
8. **Dive pacing.** `power3.in` then `power2.in` on spline progress both left the
   approach imperceptible until the last ~0.4 s. → Two segments, accelerate
   (`power2.in`) to 8.6 s then settle (`power2.out`), with the middle key chosen
   so velocity is continuous.
9. **TypeScript 7** rejected a generic DOM helper ("union type too complex") →
   simplified its signature.
10. **Blank white moon.** I first blamed leftover additive rays; the real cause
    was that I had set the moon's own surface to ~1.2 (HDR). That is above the
    bloom threshold and deep in the tone shoulder, so highlands and maria both
    landed within a few percent of white. → Moon surface lowered to ~0.93 with
    darker maria, and its resolve moved earlier (8.25–9.4 s) so the face is
    readable before the transition window opens.

### Performance observations

- 1920×1080, Scene 01, three full renders: **99.8 s, 88.6 s, 93.8 s for 300
  frames (≈3.0–3.4 fps)** including PNG encoding and transfer out of the
  browser. In the first run: 4.7 fps during the dark opening, ~3.0 fps with the
  burst on screen. Integrated GPU.
- x264 `slow`: 300 frames in ~13 s. At CRF 14 the 10 s clip was 60.5 MB
  (48 Mbit/s — the grain is expensive to encode); default changed to CRF 17
  (35.0 MB for the final version of the clip).
- Three 1080p stills including browser start-up: ~3 s.
- Real-time preview frame rate in the dev UI: **not measured.**

### Verification performed

- `tsc --noEmit` passes.
- ffprobe on the Scene 01 clip: `h264`, 1920×1080, `yuv420p`, 30/1 fps,
  `nb_read_frames=300`, `duration=10.000000`.
- Frames inspected by eye at 0.3, 1.5, 2.6, 3.2, 4.6, 5.3, 6.2, 7.4, 8.8, 9.0,
  9.2, 9.5, 9.6, 9.95 s, plus 25-frame contact sheets of the whole scene and a
  16-frame sheet of the dive.
- `npm run smoke` (headless Edge): 17/17 checks pass — frame stepping, play/pause,
  scene jump, unbuilt-scene label, scrubbing, PNG screenshot download, resolution
  switch, no page errors, no control elements in film mode, and **five frames
  re-rendered out of order hash identically** (SHA-256 of the PNG data).

### Not done / limitations

- **Scenes 02–09 are not built.** A full-film render would be 10 s of footage
  followed by 80 s of black. No 90-second export has been made.
- Transition 01→02 cannot be judged until Scene 02 exists; at present Scene 01
  dissolves to black at 9.7–10.3 s.
- No depth of field. Kuwahara pass built but unused (it erases thin needles).
- The dev UI was exercised only by the automated smoke test and one screenshot
  of it; no human has used it yet, and its real-time playback frame rate is
  unmeasured.
- Determinism was checked on 5 frames at half resolution on one machine — not
  across the whole scene, and not across GPUs.
- Reference image authors are unidentified; the images are not in the repo.

### Lessons

- Looking at the output is the job. Iterations 1–3 all compiled and "ran".
- Bloom is the fastest way to lose a black-background identity; set the
  threshold in HDR and keep it there.
- Guard every `pow`; one NaN is a black frame.
- Judge motion with a contact sheet, not single stills — the pacing problem was
  invisible in every individual frame.
- An ease-in on distance is not an ease-in on apparent size: on-screen size
  goes as 1/distance, so the move feels static and then explodes.

### Commits

| Commit | Subject |
|---|---|
| `38741bf` | chore: initialize eidolon rendering environment |
| `b379306` | docs: add art direction, storyboard, asset manifest and credits |
| `1fe7096` | feat: implement deterministic cinematic timeline |
| `538dcbd` | feat: create cosmic awakening sequence |
| `61fe941` | feat: implement offline film rendering |
| `0a371b4` | chore: normalize line endings to LF |
| *(the commit that adds this log)* | docs: record visual experiments and rendering results |

Note: the engine, scene and renderer were developed together and iterated on
before being committed, so the commits group the finished code by subject; the
iteration history is the table of visual results above, not the git history.
