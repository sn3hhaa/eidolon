# EIDOLON — Storyboard

**Running time:** 90.000 s · **30 fps** · **2700 frames** · 1920×1080

Nine scenes of exactly 10 s (300 frames) each. Transitions straddle each scene
boundary; during a transition both scenes are rendered and mixed, so a scene must
be drawable slightly before its start and after its end.

The master timeline lives in [`src/film.ts`](../src/film.ts). This document and
that file must agree.

| # | Scene | Time | Frames | Reference | Status |
|---|---|---|---|---|---|
| 01 | The Awakening | 00:00–00:10 | 0–299 | R1 | **built** |
| 02 | The Forgotten Gate | 00:10–00:20 | 300–599 | R2 | not built |
| 03 | The Impossible Forest | 00:20–00:30 | 600–899 | R3 | not built |
| 04 | The Garden of Stars | 00:30–00:40 | 900–1199 | R4 | not built |
| 05 | The Celestial Herd | 00:40–00:50 | 1200–1499 | R5 | not built |
| 06 | The Midnight Carnival | 00:50–01:00 | 1500–1799 | R6 | not built |
| 07 | The Floating City | 01:00–01:10 | 1800–2099 | R7 | not built |
| 08 | The Last Memory | 01:10–01:20 | 2100–2399 | R3 | not built |
| 09 | The Return | 01:20–01:30 | 2400–2699 | R1 + all | not built |

Scenes marked *not built* currently render pure black (`PendingScene`). Their
entries below are the plan, not a description of existing footage.

---

## Scene 01 — THE AWAKENING · 00:00–00:10 · built

**Idea.** A light is born in the dark, finds the shapes around it, and explodes.

| Time | Action | Camera |
|---|---|---|
| 0.0–0.6 | Black. | Static at z≈47, 36° lens, slight roll (+2.5°). |
| 0.6–4.5 | A seed star appears as a four-point glint. A sphere of light expands from it: cross-shaped sparkles switch on as it passes, and the rims of painted navy fragments emerge from the black — first slate and cream, moonlit. | Slow dolly forward on a gentle S-curve, roll easing to −2°. Floating drift. |
| 4.5–4.95 | The light draws breath: dims and contracts. | Continues. |
| 4.95–6.9 | Ignition. ~560 needles in four angular layers plus 300 true-3D rays and 170 loose dashes shoot out; a thin broken shock ring races off; 2,600 embers are thrown on decelerating paths; fragments recoil outward and their rims turn gold and burnt orange on the side facing the burst. | Dolly continues; lens opens 38°→40°. |
| 6.9–10.0 | The dive. The camera accelerates toward the core; needles stretch (warp). From 8.5 s the burst collapses — rays fade, the core swells and its surface resolves into a moon with grey maria. | Ease-in (power2) down the axis to z=2.6, lens 40°→62°, roll to +9°. |

**Environment animation.** Fragments drift and slowly rotate; needles flicker and
the four ray layers counter-rotate; sparkles twinkle; dust drifts; embers decelerate
and wobble.

**End frame.** A cream moon at ~65 % of frame height among gold-lit cloud
fragments on black.

**→ Transition 01→02 (9.7–10.3 s, luma dissolve).** *Motif: the core becomes the
moon.* The incoming cobalt sky arrives through the brightest pixels first, so the
moon disc is the bridge: Scene 02 must open with its moon at the same size and
position, then pull back to reveal the gate.

---

## Scene 02 — THE FORGOTTEN GATE · 00:10–00:20 · planned

**Idea.** The moon was over a place all along.

- **Open** on the moon, matching Scene 01's end frame; the black around it floods
  to flat cobalt as the camera pulls back and sinks.
- **Camera.** Starts low over the water (10–20 cm above it), glides forward
  between giant lotus leaves (foreground parallax, shallow focus), passes the
  kneeling cloaked figure on the left, then arcs ~25° to the right toward the
  gateway, ending on a slightly low angle with the moon inside the arch.
- **Environment animation.** Leaves sway on stems (vertex wind); lily pads bob;
  the water's reflection of the gate shivers; tiny white flowers flicker; canopy
  clumps breathe.
- **Depth planes.** (1) foreground lotus leaves, out of focus → (2) the figure on
  her rock → (3) water → (4) gateway + flanking shrubs → (5) cloud-pruned trees →
  (6) flat cobalt sky + moon.

**→ Transition 02→03 (19.6–20.4 s).** *Motif: ripple → petal.* A single ripple
ring spreads on the water; the camera tilts down into it; the ring's outline
stays on screen and becomes the rim of a pink petal as the water goes black.

---

## Scene 03 — THE IMPOSSIBLE FOREST · 00:20–00:30 · planned

**Idea.** Scale breaks. The traveller is tiny.

- **Open** on the petal edge, pull back and down to reveal it belongs to a flower
  several storeys tall.
- **Camera.** Crane down the white stalk along the mossy trunk to ground level,
  find the tiny traveller and a small bioluminescent glow among the roots, then
  tilt straight up as a second giant flower opens overhead.
- **Environment animation.** Petals undulate; pom-pom flowers nod; bare twigs bend
  slowly; pollen drifts upward; the vermilion bars stay perfectly still (they are
  graphic, not physical).
- **Composition rule.** At least half the frame stays black at all times.

**→ Transition 03→04 (29.6–30.4 s).** *Motif: flower centre → stars.* The camera
rises into the open flower's luminous centre; its stamens' tips become points of
light, the pink falls away, and the points are stars.

---

## Scene 04 — THE GARDEN OF STARS · 00:30–00:40 · planned

**Idea.** A breath. The gentlest scene.

- **Camera.** Ground level, travelling slowly forward and slightly sideways
  through the stems, flowers passing close to the lens; a slow rise at the end to
  look over the flower-tops at the sky.
- **Environment animation.** Flowers sway in layered wind; rain streaks fall
  diagonally; points of light lift off petals and float upward to join the stars;
  flowers pulse brighter in slow waves (to be keyed to the music in the edit).

**→ Transition 04→05 (39.6–40.4 s).** *Motif: falling star → the eye.* One star
falls, grows, and resolves into the orange concentric disc of the celestial
being.

---

## Scene 05 — THE CELESTIAL HERD · 00:40–00:50 · planned

**Idea.** The dream becomes naive and strange.

- **Camera.** Starts close on the orange disc (continuing the falling star), pulls
  back to show the whole being above the lime hill and the antelopes; drifts down
  the slope toward the pit; in the last 2 s tips over its rim and descends.
- **Environment animation.** The disc's rings counter-rotate slowly and the eye
  blinks once; antelopes walk on the hill and leap through the sky in an arc;
  halos wobble; grass hatching shimmers; the rainbow arch brightens as the camera
  nears.

**→ Transition 05→06 (49.6–50.4 s).** *Motif: rainbow → tunnel.* Falling through
the rainbow arch, its bands stretch into a striped tunnel that becomes a carnival
tent's entrance.

---

## Scene 06 — THE MIDNIGHT CARNIVAL · 00:50–01:00 · planned

**Idea.** Loud, theatrical, slightly wrong.

- **Camera.** Bursts out of the striped tunnel onto the checkerboard floor; a
  low, fast tracking shot down the red carpet between the tents; swings up past
  giant masks toward the Ferris wheel.
- **Environment animation.** Signs light in sequence; bulbs chase; the Ferris
  wheel turns; silhouettes move behind backlit curtains; balloons bob.
- **Surface.** Stepped colour ramps and ordered dithering to honour the pixel-art
  reference while staying in 3D.

**→ Transition 06→07 (59.6–60.4 s).** *Motif: mechanical light → aircraft.* A
glowing mechanical toy lifts off from the top of the wheel; the camera follows it
up into black, where it is revealed to be a full-sized aircraft.

---

## Scene 07 — THE FLOATING CITY · 01:00–01:10 · planned

**Idea.** Everything at once, all at the wrong size.

- **Camera.** Aerial chase behind and beside the orange aircraft, weaving past
  neon capsules and satellites, over the pale platform of tiny walking figures,
  then closing in on one lit cabin window.
- **Environment animation.** Propellers and pontoons, drifting satellites, neon
  flicker, a poster strip scrolling below, tiny pedestrians on walk cycles, a
  huge cloud-and-sea face slowly turning its eyes.

**→ Transition 07→08 (69.6–70.4 s).** *Motif: window → fire.* Push into the
bright window until it fills the frame as warm light, which gutters and is a
campfire.

---

## Scene 08 — THE LAST MEMORY · 01:10–01:20 · planned

**Idea.** The emotional centre. Stillness.

- **Camera.** A slow ~40° orbit around the seated traveller at fire height, the
  giant flower and the mossy trunk sliding behind them; the move decelerates to a
  complete stop by 01:18.
- **Environment animation.** Fire flicker and sparks; the faintest petal motion;
  then everything settles. The stillness is the event.
- **Composition.** R3 as closely as possible: flower upper right, trunk sweeping
  through, traveller and fire lower centre, black everywhere else, vermilion bars.

**→ Transition 08→09 (79.6–80.4 s).** *Motif: sparks → celestial particles.* The
camera tilts up to follow the sparks; they keep rising, multiply, and become the
sparkles of Scene 01.

---

## Scene 09 — THE RETURN · 01:20–01:30 · planned

**Idea.** The dream recognises you, and closes.

- **80–85 s.** The cosmic world of Scene 01 re-forms around the rising particles.
  Inside the fragments — which are now windows — glimpses of the gate, the flower,
  the hill, the carnival, the city (render-to-texture from the scenes themselves).
- **85–87.5 s.** The camera pulls *backward* (the reverse of Scene 01's dive)
  while the fragments fold inward toward the light and the burst runs in reverse.
- **87.5–88 s.** The light closes to a point and goes out. Black.
- **88–89.5 s.** Title, centred, cream on black: **EIDOLON** / *a dream that
  remembers you*.
- **89.5–90 s.** Fade to black.

The title is the only text in the film and is rendered inside the film itself
(not DOM).
