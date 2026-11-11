# NO SIGNAL

*The world stopped. She didn't.*

A 90-second original animated short. A rollerblader crosses a sunlit waterfront town; mid-jump,
time stops for everyone but her. She plays through the frozen streets, strings together one
impossible line over a bus caught tilting through a turn, and has to land a last trick off the
long stairs just as the world starts moving again. Nobody notices. She puts her headphones back
on and rolls away. No dialogue; silent, ready for a soundtrack.

The protagonist is an unnamed girl. She has no name anywhere in the film, the code or these docs.

| | |
|---|---|
| Length | 90 s · 2700 frames · 30 fps |
| Format | 1920×1080 · H.264 (yuv420p, BT.709) · no audio track |
| Final film | `output/no_signal_final.mp4` |
| Preview | `output/no_signal_preview.mp4` (960×540) |
| Contact sheet | `output/no_signal_contact_sheet.jpg` (one frame per shot) |

`output/` is generated and not committed. Selected frames are in `docs/media/`.

## How it is made

A cel-shaded 3D film rendered offline, frame by frame, from this repository:

- **Characters** — CC0 anime-style VRM avatars. The protagonist keeps a base avatar's head, face
  rig, hair and hands; her oversized cobalt jacket with orange accents, cream cargo trousers,
  inline skates, headphones and crossbody bag are original and generated in code.
- **Animation** — her skating is authored procedurally (stride cycle, tucks, airs, grinds,
  landings on IK) as one continuous performance; ballistic arcs obey gravity. Pedestrians play
  retargeted CC0 animation clips.
- **City** — one cohesive procedural set: high street, plazas, a raised walkway, terrace, long
  stairs, promenade and sea, with traffic, a bus, pedestrians, birds, fountain water and leaves
  that all stop and restart on one world clock.
- **Look** — hard two-tone toon shading with violet shadow fill, ink lines from depth and colour
  edges, real sub-frame motion blur, a single wave that carries the freeze through the world.
- **Renderer** — Three.js in headless Chrome on the local GPU, driven at exact timestamps by
  Playwright, encoded with FFmpeg.

Details, experiments, problems and known limitations: [docs/PRODUCTION.md](docs/PRODUCTION.md).
Shot list: [docs/SHOTLIST.md](docs/SHOTLIST.md). Asset sources and licences:
[docs/ASSET_CREDITS.md](docs/ASSET_CREDITS.md).

## Run it

Requires Node 20+, Chrome or Edge, a GPU, and FFmpeg on PATH.

```
npm install
npm run dev                         # scrub the film in a browser (space = play, arrows = step)
npm run stills -- 1,13.05,69.4      # render single frames to output/stills/
npm run render:preview              # 960×540 preview
npm run render                      # full 1920×1080 film (resumable)
npm run contact                     # contact sheet from the final film
npm run typecheck
```

Debug views: `npm run stills -- 0,1,2 --query debug=block` (blocking pass with a chase camera),
`debug=skate` (pose vocabulary), `debug=face` (expression calibration), `debug=ground`,
`debug=buildings`, `debug=props`, `debug=collide` (her path against the set's solids).

## Layout

```
src/engine/    film runner (shots, hard cuts, sub-frame blur), post pass (ink, freeze wave, grade), toon look
src/char/      VRM actor (retargeting, IK, expressions, springs), shell clothing, wardrobe, skates, skating poses
src/world/     layout.ts (the one city), ground/, buildings/, vehicles/, props/
src/shots/     perform*.ts (her performance), hero/crowd/traffic/nature (the world on its clock), shots1/2.ts (42 shots), production.ts
scripts/       render.mjs (offline renderer), contact.mjs, sheet.mjs
public/assets/ third-party CC0 assets (see docs/ASSET_CREDITS.md)
references/    local art-direction reference (not committed)
```

## Licence

No open-source licence has been chosen for the original code and film in this repository; all
rights are reserved by the author until one is. Third-party assets are CC0 as credited.
