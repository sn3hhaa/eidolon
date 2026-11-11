/**
 * FAST FORWARD — the one city every shot lives in. Single source of truth for geography.
 * Units: metres. +X east, +Z south, +Y up. Road surface y = 0, every pedestrian surface
 * at ground level (sidewalks, plazas, promenade) y = CURB.
 *
 *            N (-Z)
 *   ───────────── north blocks ──────────────┐ H ┌──── north-east blocks
 *   ═══════════ MAIN STREET (z = 0) ═════════╪ A ╪═══════════════
 *   blocks │ COURT │ bldg │ SPLASH │ CORNER  │ R │ HIGH WALK (raised deck, runs south)
 *          │ plaza │      │ plaza  │ +BANK   │ B │   ║
 *   ───── south blocks ────────────────────  │ O │   ║ → TERRACE → STAIRS (down, south)
 *   ══════════════ WATERFRONT PROMENADE (z 62‥84) ══════════════════  then sea (+Z)
 *
 * Story path: she skates east along Main St, jumps the roadworks barrier (time freezes),
 * finds the ball at the court, plays through the frozen street and the splash plaza, rides
 * ledge → bank ramp → tilted bus roof → High Walk beam, then south over the terrace, off the
 * long stairs, and lands on the promenade.
 */
export const CURB = 0.15;

export const L = {
  /** east–west high street */
  main: { z: 0, x0: -120, x1: 112, halfRoad: 5, sidewalk: 4.5 },          // roadway z∈[-5,5]; sidewalks to z=±9.5 (building frontage line)
  /** north–south avenue, ends at the promenade */
  harbor: { x: 48, z0: -72, z1: 62, halfRoad: 4.5, sidewalk: 3.5 },        // roadway x∈[43.5,52.5]; sidewalks to x=40 and x=56
  /** roadworks she jumps at the start: striped low barrier + cones in the south curb lane */
  barrier: { x: -31, z: 3.4, width: 2.4, height: 0.62 },
  /** pocket plaza with a basketball half-court (hoop on the south side, facing north) */
  court: { x0: -24, x1: -4, z0: 9.5, z1: 28, hoop: { x: -14, z: 25.6, rimY: 3.05 + CURB } },
  /** splash-pad plaza: ground jets on a grid, no basin */
  splash: { x0: 6, x1: 30, z0: 9.5, z1: 26, pad: { x: 17, z: 13.2, r: 4.2 }, jets: [[14.4, 11.6], [17, 10.9], [19.6, 11.6], [13.6, 13.8], [17, 13.2], [20.4, 13.8], [14.8, 15.9], [17, 16.4], [19.2, 15.9]] as [number, number][] },
  /** long planter ledge on the south sidewalk she grinds (top is a 0.4 m wide granite cap) */
  ledge: { x0: 21, x1: 31.5, z: 7.3, width: 0.4, height: 0.46 },
  /** sculptural concrete bank ramp rising eastwards at the south-west corner of the intersection */
  bank: { x0: 34, x1: 42.5, z0: 6.2, z1: 8.6, height: 2.15, power: 1.6 },
  /** raised pedestrian deck on an arcade, east side of Harbor Ave; its west edge is a low concrete beam she grinds */
  highwalk: { x0: 56, x1: 61.5, z0: 5, z1: 42, y: 2.75, beam: { w: 0.45, h: 0.25 } },
  /** upper terrace the High Walk opens onto */
  terrace: { x0: 56, x1: 78, z0: 42, z1: 58, y: 2.75 },
  /** broad staircase from the terrace down to the promenade */
  stairs: { x0: 59, x1: 73, zTop: 58, steps: 17, run: 0.38 },
  /** waterfront promenade and quay edge */
  promenade: { x0: -70, x1: 140, z0: 62, z1: 84 },
  water: { y: -1.9 },
};

export const STAIR_RISE = (L.terrace.y - CURB) / L.stairs.steps;
export const STAIRS_Z1 = L.stairs.zTop + L.stairs.steps * L.stairs.run;

/** Height of the bank ramp surface above y=0 at world x (valid for z inside the ramp footprint). */
export function bankY(x: number) {
  const s = Math.min(1, Math.max(0, (x - L.bank.x0) / (L.bank.x1 - L.bank.x0)));
  return CURB + L.bank.height * Math.pow(s, L.bank.power);
}
/** Slope angle (radians) of the bank ramp at world x. */
export function bankSlope(x: number) {
  const s = Math.min(1, Math.max(1e-4, (x - L.bank.x0) / (L.bank.x1 - L.bank.x0)));
  return Math.atan((L.bank.height * L.bank.power * Math.pow(s, L.bank.power - 1)) / (L.bank.x1 - L.bank.x0));
}
/** Stair tread height at world z (top landing → promenade). */
export function stairY(z: number) {
  if (z <= L.stairs.zTop) return L.terrace.y;
  const i = Math.min(L.stairs.steps, Math.floor((z - L.stairs.zTop) / L.stairs.run) + 1);
  return L.terrace.y - i * STAIR_RISE;
}
