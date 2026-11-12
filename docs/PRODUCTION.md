# FAST FORWARD — production notes

What was done, with which tools, what was tried, what went wrong, and what is still weak.

## Pipeline

| Stage | Tool | Where |
|---|---|---|
| Characters | CC0 VRM avatars loaded with `@pixiv/three-vrm` (MToon shading, blendshape faces) | `src/char/actor.ts` |
| Protagonist wardrobe | Garments generated from the avatar's own body mesh ("shell clothing") so they inherit its skin weights; skates, headphones and bag modelled from primitives; hairstyle refitted from another avatar | `src/char/shell.ts`, `wardrobe.ts`, `hair.ts`, `skates.ts` |
| Animation | Skating: procedural pose vocabulary, Catmull-Rom pose sequences and analytic two-bone IK, authored as one continuous performance. Crowd: CC0 library clips retargeted by world-space rotation deltas | `src/char/skater.ts`, `src/shots/perform*.ts`, `crowd.ts` |
| City, vehicles, props | Procedural geometry with canvas-painted textures | `src/world/` |
| Look | `MeshToonMaterial` with a 3-step ramp and violet sky fill, one warm sun with a fitted shadow map, depth/colour ink-line pass, sub-frame accumulation motion blur, grade, 2D overlay for the title and speed lines | `src/engine/`, `src/shots/production.ts` |
| Rendering | Headless Chrome (ANGLE/D3D11 on an RTX 3050) stepped frame by frame at exact timestamps by Playwright; PNG frames to FFmpeg (libx264) | `scripts/render.mjs` |

Blender 5.2 is installed on the machine and the brief allowed it. It was not used: the target is
flat cel shading with ink lines, which the real-time renderer reaches, and a still renders in a
fraction of a second, which mattered more for directing 41 shots than anything Blender would add.

## Reference

The reference (a ~72 s cel-shaded anime-film-style skateboard short) was studied only as a
contact sheet, for craft: hard two-tone shading with coloured shadows, ink outlines, saturated
sunlit streets under a deep blue sky, very low wide-angle cameras, close-ups, hard cuts, a bold
yellow title over the opening. None of its story, characters, wardrobe, locations or shots is
reproduced.

## Clocks

Every frame is a pure function of film time (`src/shots/production.ts`):

- **t** — film time, 0–90 s at 30 fps.
- **σ** — story time, the girl's own real-speed time. Her whole performance is one function
  `perform(σ)`; each shot maps t to σ, and slow motion is a shallow mapping.
- **tw** — world time, equal to σ plus a constant. Each car, walker, bird flock and the bus has a
  reference story moment, so it is where it needs to be when she arrives (the bus is under her as
  she leaves the bank ramp; the crosswalk walkers are mid-crossing for the slalom).

## Geography and physics

One city, defined once in `src/world/layout.ts`: an east–west high street, a cross avenue, a
court plaza and a splash plaza, a planter ledge and a sculptural bank ramp at the corner, a raised
pedestrian deck leading to a terrace, a 17-step staircase and the promenade.

The stunt line is solved, not eyeballed. Jump heights are ballistic arcs under g = 9.81 m/s²
between fixed take-off and landing points, with speeds chosen so the arcs close: about 10 m/s
into the bank, 7.5 m/s off its lip, a 6.9 m gap to the bus roof, 9.5 m/s off the stairs for a
1.04 s, 9.9 m flight. A debug pass (`?debug=collide`) checks her ground track against every solid
footprint in the set.

## What happened, in order

1. **Leftover prototype.** The repo held an unfinished Three.js engine and a realistic adult base
   body. Rendered, it read as a mannequin, so the body was dropped; the film runner, post pass and
   toon look were kept.
2. **Character base.** Seven CC0-tagged VRoid sample avatars were inspected (licence read from
   each file's embedded metadata). One became the protagonist's base, six the crowd.
3. **Retargeting bug.** The first retarget threw the arms overhead: VRM 0.x rigs face −Z inside a
   scene that is turned 180°. Fixed by conjugating character-frame rotations into the rig frame.
4. **Wardrobe.** The jacket and trousers are cut out of the welded body surface along clean
   planes, pushed out to a boxy silhouette, smoothed, and finished with extruded rib bands;
   colours and graphics are painted per fragment from rest-pose position.
5. **Parallel builds.** Two background build agents stalled without writing a file. Re-run as
   three smaller jobs (ground and set pieces; buildings, trees and backdrop; vehicles and props)
   with incremental writes; all three completed.
6. **Sun direction.** With the sun in the south-east her whole run sat in building shadow.
   Re-aimed along the street so the road and the south- and east-facing façades are lit.
7. **Blocking fixes.** The collision pass found her plaza loop clipping planters; a banking lean
   applied in the wrong frame tipped her out of turns after a spin; props and poles sat in front of
   several lenses. Each was fixed at the source.
8. **Expressions.** A calibration sheet showed which blendshapes read well on this avatar; the
   presets were rebuilt on the open-eyed smile, surprise and the full laugh.
9. **Review round 1 (author's notes on the first preview).** Twisted and backward hands, hands
   sinking into the jacket, hair flying and changing shape, jerky legs.
   - *Hands:* explicit wrist solve (fingers continue the forearm, palm toward the body, forearm
     takes the twist); hand targets pushed out of a torso ellipse and thigh capsules; rest
     positions moved forward and outward.
   - *Hair:* the spring-bone bob whipped around at speed and flipped strands in close-ups. Replaced
     with a short cut from another CC0 avatar, fitted to her head and rigid.
   - *Legs:* the stride became a periodic spline; action transitions run through Catmull-Rom key
     sequences instead of overlapping weight windows, which had gaps where the pose snapped back.
10. **Review round 2: story and title.** The film began as a time-freeze story under another
    title. The author dropped both: the world now runs the whole time and the film is FAST FORWARD.
    The freeze effect and the end card were removed; "FABLE 5.2" animates in over the opening.
11. **Review round 3: polish.** The basketball beat became a fingertip catch-and-spin; the
    fountain became a fine spray and she twirls through it; speed lines were added at full sprint.
12. **Review round 4: arms and clothing.** A headphone hand target fixed in space had folded her
    forearms onto her upper arms whenever she crouched; targets are now anchored to the head with
    elbows out. The jacket was shortened to hip length with a depth bias on its lower front so
    raised thighs tuck under the hem; trouser hems were lifted clear of the boot cuffs.
13. **Delivery.** Headless Chrome occasionally lost its page mid-render; the renderer is
    resumable and is run in a retry loop. A soundtrack supplied by the author and an author mark
    are added with FFmpeg after the render; neither is part of the repository.

## Known limitations

- Cloth is not simulated. Jacket and trousers get a velocity/acceleration lag term and a speed
  flutter in the vertex shader. In deep crouches the thighs are hidden behind the jacket hem by a
  depth bias, not by real cloth contact.
- Hair is rigid on the head; it has no secondary motion.
- The crowd uses the sample avatars' own outfits, which are more costume-like than the
  protagonist's streetwear, and several pedestrians are instances of the same six models.
- Pedestrian animation is library clips; walkers pace back and forth on fixed lines.
- Fountain water does not react to her passing through it.
- No depth of field. Faces rely on the avatar's blendshapes; there is no bespoke facial rig.
- Backdrop towers and shop interiors are painted, not modelled.
- Verification was done on stills, per-second frame strips and a per-shot contact sheet. Several
  defects were only found when the author watched the film in motion.
- Some shot names in code (`07 the freeze`, `26 droplets fall`) still carry labels from the
  earlier time-freeze version.

## Reproducing the render

```
npm install
npm run stills -- 1,19,69.4          # single frames to output/stills/
npm run render:preview               # 960×540 preview
npm run render                       # 1920×1080, 2700 frames to output/fast_forward_final.mp4
npm run contact                      # output/fast_forward_contact_sheet.jpg
```

Rendering is resumable (existing frames are kept unless `--clean`). Requires Chrome or Edge, a
GPU, and FFmpeg on PATH.
