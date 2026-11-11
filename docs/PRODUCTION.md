# FAST FORWARD — production notes

What was actually done, with which tools, what was tried, what went wrong, and what is still weak.

## Pipeline

| Stage | Tool | Where |
|---|---|---|
| Characters | CC0 VRM avatars loaded with `@pixiv/three-vrm` (MToon shading, blendshape faces, spring-bone hair) | `src/char/actor.ts` |
| Protagonist wardrobe | Garments generated from the avatar's own body mesh ("shell clothing") so they inherit its skin weights; skates/headphones/bag modelled from primitives | `src/char/shell.ts`, `wardrobe.ts`, `skates.ts` |
| Animation | Skating: procedural pose vocabulary + analytic two-bone IK, authored as one continuous performance. Crowd: CC0 library clips retargeted by world-space rotation deltas | `src/char/skater.ts`, `src/shots/perform*.ts`, `crowd.ts` |
| City, vehicles, props | Procedural geometry with canvas-painted textures | `src/world/` |
| Look | Three.js `MeshToonMaterial` with a 3-step ramp + violet sky fill, one warm sun with a fitted shadow map, depth/colour ink-line pass, sub-frame accumulation motion blur, grade | `src/engine/` |
| Rendering | Headless Chrome (ANGLE/D3D11 on the laptop's RTX 3050) driven frame-by-frame at exact timestamps by Playwright; PNG frames → FFmpeg (libx264) | `scripts/render.mjs` |

Blender 5.2 is installed on the machine and the brief allowed it. It was not used: the target look is
flat cel shading with ink lines, which the real-time renderer reaches, and a still renders in a
fraction of a second, which mattered more for directing 42 shots than anything Blender would add.

## Reference analysis

The reference (a ~72 s cel-shaded anime-film-style skateboard short) was studied only as a contact
sheet for craft: hard two-tone shading with coloured shadows, ink outlines, saturated sunlit
streets under a deep blue sky with cumulus, very low wide-angle cameras close to wheels and shoes,
close-ups of the face, hard cuts. None of its story, characters, wardrobe, locations or shots is
reproduced: FAST FORWARD has a different protagonist, vehicle (inline skates), premise (time stops),
city (a waterfront town) and shot list.

## Three clocks

Every frame is a pure function of film time, through three clocks (`src/shots/production.ts`):

- **t** — film time, 0–90 s, 30 fps.
- **σ** — story time, the girl's own real-speed time. Her whole performance is one function
  `perform(σ)`; each shot maps t → σ, and slow motion is nothing more than a shallow mapping.
- **tw** — world time. It runs with σ until the freeze (σ = 11.02, mid-jump), stays constant while
  the world is stopped, creeps back as she notices on the High Walk, and returns to full speed as
  she rises off the stairs. Cars, the bus, pedestrians, birds, fountain droplets, leaves, the ball
  and the sea are all functions of tw, so "frozen" needs no special case.

## Geography and physics

One city, defined once in `src/world/layout.ts`: an east–west high street, a cross avenue, a court
plaza and a splash plaza, a planter ledge and a sculptural bank ramp at the corner, a raised
pedestrian deck (the High Walk) leading to a terrace, a 17-step staircase and the promenade.

The stunt line is solved, not eyeballed: jump heights are ballistic arcs under g = 9.81 m/s²
between fixed take-off and landing points, with speeds chosen so the arcs close (≈10 m/s into the
bank, 7.5 m/s off its lip, a 6.9 m gap to the bus roof, 9.5 m/s off the stairs for a 1.04 s,
9.9 m flight). The bus is frozen mid right-turn, rolled 12° away from the turn, so its roof is
low on the side she arrives from and high on the side she leaves. A debug pass
(`?debug=collide`) checks her ground track against every solid footprint in the set.

## Experiments and problems, in order

1. **Leftover procedural mannequin.** The repo held an unfinished Three.js engine and a realistic
   adult base body (CC0, Quaternius). Rendered, it read as a mannequin — wrong for a stylized teen —
   so the base-body assets were dropped. The film runner, post pass and toon look were kept.
2. **Character base.** Seven CC0-tagged VRoid sample avatars were inspected (licence read from each
   file's embedded metadata). One became the protagonist's base, six the crowd.
3. **Retargeting bug.** First retarget threw the arms overhead: VRM 0.x rigs face −Z inside a scene
   that is turned 180°. Fixed by conjugating character-frame rotations into the rig frame.
4. **Wardrobe.** Tube-per-limb clothing was rejected up front (shoulder seams). Instead the jacket
   and trousers are cut out of the welded body surface along clean planes, pushed out to a boxy
   silhouette, smoothed, and finished with extruded rib bands; colours are painted per fragment
   from rest-pose position (crisp stripes, chevron, back print, no UVs). First pass was too fitted;
   enlarged to read as oversized.
5. **Parallel builds stalled.** The first two background build agents (city, vehicles) stalled
   without writing a file. Re-run as three smaller builds (ground and set pieces; buildings, trees
   and backdrop; vehicles and props) with incremental writes; all three completed.
6. **Sun direction.** With the sun in the south-east the whole south kerb lane — her run — sat in
   building shadow. Re-aimed to the east, slightly south: the street is lit along its length,
   south- and east-facing façades are lit, tree shadows rake across the road.
7. **Plaza loop through furniture.** The collision pass found her splash-plaza loop clipping
   planters and the kiosk; rerouted through open paving.
8. **Lean in the wrong frame.** After the 540 she lands backwards; the banking lean was applied in
   the facing frame, tipping her out of the turn. Lean is now applied about the travel direction
   and the body's own spin afterwards.
9. **Expressions.** A calibration sheet showed that partial "happy" reads sleepy and "angry" draws
   a forehead shadow on this avatar; presets were rebuilt on "relaxed" (open-eyed smile),
   "surprised" and full "happy" (eyes-shut laugh).
10. **Things in front of the lens.** A flying newspaper filled the reveal shot, a drifting leaf sat
    on her forehead in a close-up, a lamp post split the freeze shot, a pedestrian blocked the
    landing wide, a car drove onto the promenade. Each was fixed at the source (props moved, leaves
    keep clear of her head, cameras moved, traffic stopped at the avenue's end).
11. **GPU.** Headless Chrome defaulted to the integrated GPU; `--force_high_performance_gpu`
    moved rendering to the RTX 3050.

12. **Review round (user notes on the first preview).** Reported: twisted/backward hands, hands sinking
    into the jacket, arms held behind the body, hair flying and changing shape, jerky legs, the
    crossed-out-signal back print, and the title treatment. Fixes, all in place rather than rebuilt:
    - *Hands:* the wrist is now solved explicitly — fingers continue the forearm, the palm turns toward
      the body (or down when the arm is out wide), and the forearm takes the twist; hand targets are
      pushed out of an elliptical torso volume and thigh capsules so they cannot enter the jacket or
      trousers; rest positions moved forward and outward; elbows point out, not back.
    - *Hair:* the base avatar's bob was driven by spring bones that whipped around at 10 m/s and
      flipped strands in close-ups. It is replaced by a short tousled cut taken from another CC0
      avatar, fitted to her head and rigid.
    - *Legs and transitions:* the stride leg is a periodic spline (no velocity jumps); action
      transitions (tuck → launch → air → land…) run through a Catmull-Rom key sequence instead of
      overlapping weight windows, which had gaps where the pose snapped back to the stride for a frame.
    - *Jacket:* back print replaced by painted lettering, bolt and stars; chest badge added.
    - *Titles:* "MADE WITH FABLE 5.2" over the opening shots in the reference's bold-yellow manner;
      FAST FORWARD typed over the final shot; the black end card is gone.

13. **Second review round: no freeze, new name.** At the user's direction the time-stop premise was
    dropped: the world now runs with her for the whole film. Every car, walker, bird flock and the bus
    is timed to the story moment she meets it (the bus arrives under her as she leaves the bank ramp;
    crosswalk walkers pace back and forth so she can slalom them; pigeons burst up as she ducks).
    The basketball is passed to her and tapped back. The freeze wave, tremble and end title were
    removed; only "FABLE 5.2" appears, over the opening. The film was renamed FAST FORWARD and the
    old name removed from the repo and jacket. Parts of the docs above describe the earlier freeze
    design (the "three clocks" section: tw now simply equals σ plus a constant).

## Known limitations (honest list)

- Cloth is not simulated. Jacket and trousers get a velocity/acceleration "lag" term and a speed
  flutter in the vertex shader; the hair is rigid on the head (no secondary motion). Deep crouches still let the
  thighs push into the jacket hem.
- The crowd uses the sample avatars' own outfits, which are more costume-like than the protagonist's
  streetwear, and several pedestrians are instances of the same six models.
- Pedestrian animation is library clips; only the head turn toward the landing is directed.
- Fountain droplets do not react to her passing through them.
- No depth of field. Faces rely on the avatar's blendshapes; there is no bespoke facial rig.
- Backdrop towers and shop interiors are painted, not modelled; they are not meant for close view.
- The film is silent by design; the title card uses system fonts.

## Reproducing the render

```
npm install
npm run stills -- 1,13.05,69.4        # single frames → output/stills/
npm run render:preview                # 960×540 preview → output/fast_forward_preview.mp4
npm run render                        # 1920×1080, 2700 frames → output/fast_forward_final.mp4
npm run contact                       # output/fast_forward_contact_sheet.jpg
```

Rendering is resumable (existing frames are kept unless `--clean`). Requires Chrome or Edge, a
GPU, and FFmpeg on PATH.
