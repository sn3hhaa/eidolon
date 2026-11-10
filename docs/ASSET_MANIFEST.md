# EIDOLON — Asset Manifest

Every visual element the film needs, how it is (or will be) made, and its honest
current status.

**Status key:** `done` built and inspected in rendered frames · `planned` not
started · `placeholder` exists but is a stand-in (none at present).

**Technique key:** `shader` procedural in GLSL · `geo` custom Three.js geometry
built in code · `2.5D` painted/generated texture planes in parallax layers ·
`points` GPU particles · `RTT` render-to-texture.

Blender is **not installed** on the build machine (checked 2026-11-11), so nothing
below depends on it. If it becomes available, the items marked ◆ are the ones that
would benefit most from sculpted geometry.

## Scene 01 — The Awakening (built)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Navy fragments (48 instances: 6 far continents, 22 mid, 15 near, 5 moon-stones) | instanced quads + `shader` | done | Silhouette, gouache interior, cumulus rim, burst-facing light all generated per fragment. `shards.ts` |
| Seed star / core / moon disc | billboard `shader` | done | Four-point glint → ring core → moon with maria. `burst.ts` |
| Needle rays (4 angular layers, ~830 slots) | billboard `shader` | done | |
| 3D rays + detached dashes (300 + 170) | instanced `geo` | done | Axis-aligned billboards for parallax |
| Shock ring | billboard `shader` | done | Thin, broken by angular noise |
| Cross sparkles + dust (520 + 4,200) | `points` | done | Revealed by an expanding sphere of light |
| Embers (2,600) | `points` | done | Closed-form ballistic motion |

## Scene 02 — The Forgotten Gate (planned)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Ornamented stone gateway ◆ | `geo` (lathe/extrude profiles, instanced ornament) + carved-relief `shader` | planned | The hardest asset in the film. Needs tiered cornices, finials, flanking wings. Camera orbits it, so it must be real 3D. |
| Kneeling cloaked figure | `2.5D` silhouette built from layered shapes + pattern `shader` | planned | Seen in profile only; limited parallax |
| Giant lotus leaves, lily pads | `geo` (deformed discs, vein `shader`) | planned | Foreground, wind-animated |
| Cloud-pruned trees | `2.5D` layered canopy clumps + `geo` trunks | planned | |
| Shrubs, small flowers | instanced `geo` / `points` | planned | |
| Water with reflections | planar reflection + ripple `shader` | planned | |
| Cobalt sky + moon | `shader` | planned | Moon must match Scene 01's end frame |

## Scene 03 / 08 — The Impossible Forest / The Last Memory (planned; shared kit)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Giant pink flower (petals, stalk, pistil, stamens) ◆ | `geo` (parametric petals) + airbrush `shader` | planned | Hero asset; must open (Scene 03) |
| Mossy serpentine trunk + roots ◆ | `geo` (tube along spline, noise-displaced) + moss stipple `shader` | planned | |
| Bare twig trees | `geo` (recursive branching, seeded) | planned | |
| Pink pom-pom flowers | instanced `geo` (spike fans) | planned | |
| Blue-violet coral bushes | `geo` (branching) | planned | |
| Vermilion / teal vertical bars | flat `geo`, unlit | planned | |
| Traveller (seated; tiny in 03) | `2.5D` layered figure | planned | Same character as Scene 02's figure |
| Campfire: logs, flame, sparks | `geo` + flame `shader` + `points` | planned | |
| Black water with flat colour patches, red leaves | `shader` + instanced `geo` | planned | |

## Scene 04 — The Garden of Stars (planned)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Flower species ×10 (delphinium spires, poppies, lilies, hydrangea, iris, day-lily, daisy, dahlia, cosmos, wildflower) | instanced parametric `geo` + petal `shader` | planned | Thousands of instances in depth layers; Kuwahara pass on |
| Foliage and stems | instanced `geo` | planned | |
| Star field, rain streaks, rising light motes | `points` / `shader` | planned | |

## Scene 05 — The Celestial Herd (planned)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Crayon-hatched grass hill | displaced `geo` + hatching `shader` | planned | Must look drawn, not like terrain |
| Celestial being (crescent, ringed disc, eye, face) | `geo` discs + `shader` | planned | Rings rotate; eye blinks |
| White antelopes with halos | `2.5D` articulated cut-outs (rigged planes) | planned | Walk + leap cycles as pure functions of time |
| White humanoid figures | `2.5D` soft shapes | planned | |
| Rainbow portal pit, flower ring, tiny Earth | `geo` + portal `shader` | planned | |

## Scene 06 — The Midnight Carnival (planned)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Tents (striped, draped) | `geo` + stripe/dither `shader` | planned | |
| Ferris wheel with light chase | `geo` + emissive `points` | planned | |
| Giant masks / faces | `geo` reliefs | planned | Original designs |
| Neon signage | `geo` tubes, invented glyphs | planned | No legible real text |
| Curtain silhouettes | `2.5D` shadow-play planes | planned | |
| Checkerboard floor, red carpet | `shader` | planned | |
| Balloons, bunting, overhanging foliage | instanced `geo` | planned | |

## Scene 07 — The Floating City (planned)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Hero aircraft (bulbous fuselage, pontoons, cockpit, lamps) ◆ | `geo` (lathe + loft) + airbrush `shader` | planned | Camera follows it closely |
| Small rockets, satellites, capsules | instanced `geo` | planned | |
| Giant cloud-and-sea face | `2.5D` painted in `shader` on a curved plane | planned | Original face, not a likeness |
| Red coral sculpture | `geo` (branching tubes) | planned | |
| Platform, poster strip, pedestrians | `geo` + `2.5D` walk-cycle sprites | planned | |
| Neon capsule signs | `geo` + invented glyph `shader` | planned | |

## Scene 09 — The Return (planned)

| Asset | Technique | Status | Notes |
|---|---|---|---|
| Scene 01 kit, time-reversed | reuse | planned | Deterministic time makes reversal trivial |
| Memory windows inside fragments | `RTT` of scenes 02–08 | planned | |
| Title card | SDF or canvas-texture type | planned | Needs a licensed/open display face — to be chosen and credited |

## Engine

| Item | Status |
|---|---|
| Absolute-time master timeline (`Film`) | done |
| Pure keyframe tracks with GSAP eases (`Track`) | done |
| Spline camera rig (`CameraRig`) | done |
| Scene/transition interfaces, two-scene compositing | done (dissolve, luma) |
| Post: Kuwahara, bloom, grade, vignette, paper tooth, grain, aberration | done |
| Depth of field | planned (needed from Scene 02) |
| Dev transport (play/pause/seek/scene select/step/screenshot/resolution) | done |
| Offline renderer: stills, frame sequence, MP4 encode, ffprobe verification | done |
| Motif-specific transitions (ripple→petal, rainbow→tunnel …) | planned — built with their scenes |

## Placeholders

None are on screen. Unbuilt scenes render **black**, by design, rather than
showing stand-in geometry.
