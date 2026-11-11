/** Shot list, acts 1–4 (0:00 – 0:50): introduction, the freeze, the frozen playground, the impossible line. */
import * as THREE from 'three';
import { shot, V, type ShotDef } from './production';
import type { Stage } from './stage';
import { A, C, D, BALL } from './perform';
import { lerp, sstep } from './util';

export function shotsA(_S: Stage): ShotDef[] {
  const mixv = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);
  return [
    // ── ACT 1 · introduction ────────────────────────────────────────────────
    shot('01 wheels', [[0, 0.25], [2.1, 2.35]], (c) => c.at([c.H.x + 0.86 - 0.1 * c.u, 0.075, c.H.z - 0.52], [c.H.x + 0.03, 0.11, c.H.z - 0.07], 30), { shadow: 7, shake: 0.002 }),
    shot('02 strap', [[2.1, 2.35], [3.8, 4.05]], (c) => c.at(c.chest.clone().add(V(0.78, 0.06 + 0.04 * c.u, 0.5 - 0.1 * c.u)), c.chest.clone().add(V(0, -0.1, 0.02)), 27), { shadow: 7, shake: 0.002 }),
    shot('03 headphones', [[3.8, 3.72], [5.9, 5.5]], (c) => c.at(c.head.clone().add(V(0.98 - 0.12 * c.u, 0.0, -0.36)), c.head.clone().add(V(0, -0.025, 0)), 25), { shadow: 7, shake: 0.002 }),
    shot('04 push off', [[5.9, 5.42], [7.9, 7.42]], (c) => c.at([-55.2, 0.3, 4.75], mixv(c.chest, V(-57, 1.2, 3.4), 0.25), 56), { shadow: 22 }),
    shot('05 side tracking', [[7.9, 7.6], [10, 9.7]], (c) => c.at([c.H.x + 3.6, 1.0, 5.25], c.chest.clone().add(V(0.3, -0.05, 0)), 40), { shadow: 16, shake: 0.007 }),
    // ── ACT 2 · time freezes ────────────────────────────────────────────────
    shot('06 barrier', [[10, 9.75], [11.5, 10.72]], (c) => c.at([-30.15, 0.2, 1.55], c.chest.clone().add(V(0, -0.15, 0)), 50), { shadow: 14 }),
    shot('07 the freeze', [[11.5, 10.72], [12.8, A.freeze], [13.35, A.land + 0.02], [14.3, 12.4]], (c) => c.at([-28.0, 0.85, -0.9], [lerp(-31, c.H.x, 0.6), 1.0 + c.H.y * 0.4, 3.2], 44), { shadow: 16, shake: 0.002 }),
    shot('08 what', [[14.3, 12.45], [16.2, 14.35]], (c) => c.at([c.H.x + 2.35, 1.5, c.H.z + 0.55], c.head.clone().add(V(0, -0.08, 0)), 32), { shadow: 12 }),
    shot('09 the ball', [[16.2, 16.75], [17.6, 18.15]], (c) => c.at([-8.7 - 0.3 * c.u, 1.3, 4.3], [-11.55, 1.15, 5.9], 40), { shadow: 10, shake: 0.002 }),
    shot('10 touch', [[17.6, 19.7], [20.4, 22.95]], (c) => c.at([-10.85 - 0.15 * c.u, 1.55, 6.55], [-11.3, 1.47 + 0.04 * c.u, 4.9], 36), { shadow: 8, shake: 0.002 }),
    // ── ACT 3 · the frozen playground ───────────────────────────────────────
    shot('11 takes off', [[20.4, 23.45], [22.6, 25.65]], (c) => { const f = V(Math.sin(c.pf.root.yaw), 0, Math.cos(c.pf.root.yaw)); c.at(c.H.clone().addScaledVector(f, 3.3).add(V(0.2, 0.36, 0.7)), c.chest, 46); }, { shadow: 14 }),
    shot('12 slalom', [[22.6, 25.65], [25, 27.65]], (c) => c.at([5.6, 5.4 - 0.5 * c.u, -3.4], [c.H.x * 0.75 - 0.4, 0.7, c.H.z * 0.75 + 0.3], 37), { shadow: 20 }),
    shot('13 duck', [[25, 27.7], [27.4, 29.02]], (c) => c.at([11.5, 0.62, 0.35], mixv(c.head, V(8.3, 1.25, 1.9), 0.45), 40), { shadow: 12 }),
    shot('14 droplets', [[27.4, 30.3], [30.6, 32.1]], (c) => c.at([20.25, 0.42 + 0.1 * c.u, 11.85], c.chest.clone().add(V(0, -0.1, 0)), 50), { shadow: 14 }),
    shot('15 spin', [[30.6, C.spin - 0.95], [32.6, C.spin + 1.25]], (c) => c.at([26.3, 2.5 - 0.3 * c.u, 18.7], [c.H.x * 0.8 + 3, 1.0, c.H.z * 0.8 + 2.6], 42), { shadow: 22 }),
    shot('16 joy', [[32.6, C.back0 + 0.15], [35, C.back1 - 0.05]], (c) => { const f = c.pf.root.yaw + (c.pf.root.spin ?? 0) + 0.5; c.at(c.head.clone().add(V(Math.sin(f) * 1.2, 0.03, Math.cos(f) * 1.2)), c.head.clone().add(V(0, -0.03, 0)), 30); }, { shadow: 8, shake: 0.006 }),
    // ── ACT 4 · the impossible stunt ────────────────────────────────────────
    shot('17 reveal', [[35, C.stop - 1.35], [37.3, C.stop + 0.95]], (c) => c.at([-7.3 + 0.25 * c.u, 1.68, 8.35], [30, 1.75, 7.05], 20), { shadow: 40, shake: 0.0015 }),
    shot('18 grin', [[37.3, 45.0], [38.6, 46.05]], (c) => c.at(c.head.clone().add(V(1.02, -0.03, -0.3)), c.head, 26), { shadow: 7, shake: 0.002 }),
    shot('19 sprint', [[38.6, D.run], [40.6, D.run + 2.25]], (c) => c.at([c.H.x + 3.5, 0.38, 4.15], c.chest.clone().add(V(0.2, -0.2, 0)), 43), { shadow: 16, shake: 0.008 }),
    shot('20 ledge', [[40.6, D.ledgeTake - 0.32], [42.8, D.ledgeOff + 0.2]], (c) => c.at([32.85, 0.78, 6.15], [c.H.x - 0.3, c.H.y + 0.85, 7.3], 38), { shadow: 16 }),
    shot('21 bank', [[42.8, D.ledgeOff + 0.2], [44.6, D.bankTop + 0.04]], (c) => c.at([45.3, 2.7, 3.7], c.chest.clone().add(V(0.4, 0, 0)), 44), { shadow: 16 }),
    shot('22 to the bus', [[44.6, D.bankTop - 0.02], [47.4, D.roofOff + 0.02]], (c) => c.at([57.35, 4.32, 9.6 - 0.3 * c.u], mixv(c.chest, V(49.6, 3.2, 7.5), 0.4), 36), { shadow: 20 }),
    shot('23 to the High Walk', [[47.4, D.roofOff - 0.02], [50, D.deck + 0.55]], (c) => c.at([57.75, 2.93, 14.6], mixv(c.chest, V(56.4, 4.0, 11.4), 0.3), 52), { shadow: 18 }),
  ];
}
export { BALL };
