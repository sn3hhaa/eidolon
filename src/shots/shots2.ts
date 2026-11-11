/** Shot list, acts 5–7 (0:50 – 1:30): time returns, the final stunt, the ending and title. */
import * as THREE from 'three';
import { shot, V, type ShotDef } from './production';
import type { Stage } from './stage';
import { D, E, F, Gs } from './perform';
import { TFZ } from './traffic';
import { lerp, sstep, hash } from './util';

export function shotsB(_S: Stage): ShotDef[] {
  const mixv = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k), G0 = F.end;
  return [
    // ── ACT 5 · time begins returning ───────────────────────────────────────
    shot('24 cheer', [[50, D.deck + 1.2], [52.3, D.deck + 3.5]], (c) => c.at([c.H.x + 0.85, c.H.y + 1.28, c.H.z + 3.5], c.head.clone().add(V(0, -0.2, 0)), 36), { shadow: 14 }),
    shot('25 pigeons stir', [[52.3, E.notice - 0.15], [54, E.notice + 1.55]], (c) => c.at([56.78, 3.12, 35.9 - 0.2 * c.u], [57.05, 3.55, 30], 33), { shadow: 12, shake: 0.002, tremble: (t) => sstep(52.5, 53.4, t) }),
    shot('26 droplets fall', [[54, 64], [55.4, 64.01]], (c) => c.at([18.5, 0.5, 15.0], [16.7, 1.25 - 0.25 * c.u, 12.8], 38), { shadow: 12, shake: 0.002, tw: (t) => TFZ + 0.42 * Math.pow(Math.max(0, t - 54.5), 1.7), tremble: (t) => 1 - sstep(54.4, 54.9, t) * 0.75, freeze: (t) => 1 - sstep(54.4, 55.4, t) * 0.5 }),
    shot('27 signal', [[55.4, 64.2], [56.6, 64.21]], (c) => c.at([39.9, 3.05, 8.0], [45.6, 5.7, 5.5], 30), { shadow: 14, shake: 0.002, tw: () => TFZ + 0.25, tremble: () => 0.6, freeze: () => 0.5, signals: (t) => { const h = hash(Math.floor(t * 16)); return h < 0.4 ? ['off', 'off'] : h < 0.6 ? ['y', 'y'] : h < 0.8 ? ['g', 'r'] : ['r', 'g']; } }),
    shot('28 the bus stirs', [[56.6, 64.7], [58.4, 66.5]], (c) => c.at([56.35, 4.05, 14.6 - 0.3 * c.u], [51.4, 2.2, 8.2], 44), { shadow: 16, shake: 0.006 }),
    shot('29 uh-oh', [[58.4, E.turn - 0.55], [59.8, E.run + 0.02]], (c) => c.at(c.head.clone().add(V(-0.42, 0.0, 1.08)), c.head.clone().add(V(0, -0.02, 0)), 28), { shadow: 7, shake: 0.004 }),
    shot('30 deck sprint', [[59.8, E.run], [62.4, E.run + 2.5]], (c) => c.at([c.H.x + 2.7, c.H.y + 1.4, c.H.z + 1.7], c.chest, 40), { shadow: 16, shake: 0.008 }),
    shot('31 terrace', [[62.4, E.run + 2.5], [65, F.take - 0.05]], (c) => c.at([65.55, 2.98, 58.75], c.chest.clone().add(V(0, -0.15, 0)), 50), { shadow: 20 }),
    // ── ACT 6 · the final stunt ─────────────────────────────────────────────
    shot('32 launch', [[65, F.take - 0.1], [66.6, F.take + 0.25]], (c) => c.at([63.95, 1.78, 61.9], mixv(c.chest, V(65, 3.7, 58.4), 0.35), 52), { shadow: 16 }),
    shot('33 the 540', [[66.6, F.take + 0.25], [72, F.take + 0.8]], (c) => { const a = lerp(-0.25, 1.55, c.u), r = 3.3 - 0.4 * Math.sin(c.u * Math.PI); c.at(c.chest.clone().add(V(Math.cos(a) * r, 0.25 - 0.5 * c.u, Math.sin(a) * r)), c.chest, 40, 0.06 * Math.sin(c.u * 3)); }, { shadow: 14, shake: 0.002 }),
    shot('34 the arc', [[72, F.take + 0.7], [74.2, F.land + 0.1]], (c) => c.at([60.4, 0.85, 75.8], mixv(V(65, 2.0, 64.5), c.chest, 0.5), 44), { shadow: 30 }),
    shot('35 landing', [[74.2, F.land - 0.06], [76.4, F.land + 1.15]], (c) => c.at([66.35, 0.2, 69.95], [c.H.x, c.H.y + lerp(0.3, 0.85, sstep(0.3, 1, c.u)), c.H.z], 45), { shadow: 12 }),
    shot('36 roll-out', [[76.4, F.land + 1.25], [79.6, F.land + 4.45]], (c) => c.at([c.H.x - 1.1, 1.25, Math.min(81.7, c.H.z + 4.7)], c.chest, 40), { shadow: 22, shake: 0.006 }),
    // ── ACT 7 · ending ──────────────────────────────────────────────────────
    shot('37 breath', [[79.6, G0 - 0.9], [81.6, G0 + 1.1]], (c) => c.at([29.2, 0.95, 81.2], c.chest.clone().add(V(0, 0.05, 0)), 38), { shadow: 16, shake: 0.003 }),
    shot('38 looks back', [[81.6, G0 + 2.0], [83.3, G0 + 3.7]], (c) => c.at(c.head.clone().add(V(1.05, 0.0, -0.85)), c.head.clone().add(V(0, -0.03, 0)), 28), { shadow: 7, shake: 0.002 }),
    shot('39 the ball comes back', [[83.3, 30], [84.7, 30.01]], (c) => c.at([-8.7, 0.5, 7.3], [-11.5, 0.98 - 0.1 * c.u, 6.4], 42), { shadow: 10, shake: 0.002, tw: (t) => TFZ - 0.02 + (t - 83.3) * 1.08, tremble: () => 0, freeze: () => 0 }),
    shot('40 headphones on', [[84.7, G0 + Gs.phones + 0.15], [86, G0 + Gs.on + 0.55]], (c) => c.at(c.head.clone().add(V(0.86, 0.0, -0.74)), c.head.clone().add(V(0, -0.02, 0)), 26), { shadow: 7, shake: 0.002 }),
    shot('41 away', [[86, G0 + Gs.away + 0.1], [88, G0 + Gs.away + 2.1]], (c) => c.at([39.6, 2.5 + 0.7 * c.u, 82.0], [20, 2.2, 78.2], 34), { shadow: 46, shake: 0.001 }),
    shot('42 title', [[88, G0 + Gs.away + 2.1], [90, G0 + Gs.away + 2.2]], (c) => c.at([39.6, 3.2, 82.0], [20, 2.2, 78.2], 34)),
  ];
}
