/** Performance segments C (frozen playground) and D (the impossible line). See perform.ts. */
import * as THREE from 'three';
import { POSE, mix, seq, type SkPose } from '../char/skater';
import { Path, track, integrate, arc, win, sstep, lerp } from './util';
import { CURB, L, bankY, bankSlope } from '../world/layout';
import { FACE, faceMix, rootOn, timeAt, BALL, EAST, type Perf } from './perfbase';

/** Motion along a path where speed is given per distance (m/s at metres): tabulated so time ↔ distance are both cheap. */
export function byDistance(vOf: (d: number) => number, total: number, t0: number, step = 0.02) {
  const T: number[] = [t0]; for (let d = 0; d < total; d += step) T.push(T[T.length - 1] + step / Math.max(0.35, vOf(d + step / 2)));
  const tAt = (d: number) => { const f = Math.min(T.length - 1.001, Math.max(0, d / step)), i = Math.floor(f); return lerp(T[i], T[i + 1], f - i); };
  const dAt = (t: number) => { if (t <= t0) return 0; let lo = 0, hi = T.length - 1; if (t >= T[hi]) return total; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; } return (lo + (t - T[lo]) / (T[hi] - T[lo])) * step; };
  return { tAt, dAt, vAt: (t: number) => (t <= t0 || t >= T[T.length - 1] ? 0 : vOf(dAt(t))), end: T[T.length - 1] };
}

// ───────────────────────────── C: the frozen playground
const pathC = new Path([[BALL.x - 0.3, BALL.z - 0.37], [-9, 4.3], [-6, 3.3], [-3.8, 2.4], [-2.1, 0.9], [-0.3, -0.4], [1.8, 0.1], [4.2, 1.2], [7, 1.7], [9.5, 2.1], [11.6, 3.6], [12.9, 5.6], [13.9, 8.6], [15.4, 11.4], [17.2, 13.4], [19.6, 15.6], [22.6, 17.3], [24.6, 16.6], [25, 14.2], [23.4, 12], [20.5, 11], [17.5, 11.6], [14.5, 13.6], [12.2, 16.2], [10.6, 17.5], [9.9, 15.2], [9.8, 12], [8.6, 9.8], [6.4, 8.2], [3.6, 7.35], [0.5, 7.3], [-1.5, 7.3], [-3.5, 7.3]]);
const C_STOP = pathC.near(-1.5, 7.3), baseC = integrate([[23.5, 0], [24.2, 2.4], [26, 5.6], [60, 5.6]]), tDec = timeAt(baseC, C_STOP - 5.6 * 0.75, 24, 60);
const dC = integrate([[23.5, 0], [24.2, 2.4], [26, 5.6], [tDec, 5.6], [tDec + 1.5, 0], [99, 0]]);
const tC = (x: number, z: number) => timeAt(dC, pathC.near(x, z), 23.5, tDec + 1.5);
/** story times of the beats in C (exported for the shot list and the world dressing) */
export const C = { slalom: tC(-2.1, 0.9), duck: tC(8.3, 1.9), hop: tC(12.6, 5.0), pad: tC(17.2, 13.4), spin: tC(25, 14.2), back0: tC(18.5, 11.3), back1: tC(11.2, 17.2), stop: tDec + 1.5, path: pathC, dist: dC };

export function segC(s: number): Perf {
  const d = Math.min(dC(s), C_STOP), v = dC.rate(s), hopT = 0.3, inHop = s > C.hop - hopT / 2 && s < C.hop + hopT / 2;
  const y = inHop ? arc(s, C.hop - hopT / 2, C.hop + hopT / 2, 0, CURB) : s < C.hop ? 0 : CURB;
  const root = rootOn(pathC, d, v, y), curv = Math.abs(pathC.curv(d));
  const spin = sstep(C.spin - 0.75, C.spin + 0.75, s) * Math.PI * 2, back = sstep(C.back0 - 0.3, C.back0 + 0.25, s) - sstep(C.back1 - 0.3, C.back1 + 0.3, s), stop = sstep(tDec + 0.15, tDec + 1.2, s);
  root.spin = spin + back * Math.PI + stop * Math.PI; root.roll = (root.roll ?? 0) + 0.16 * stop * (1 - stop) * 4;
  const cad = integrate([[23.5, 1.1], [26, 1.15], [60, 1.15]], 0.5)(s), strideW = (1 - sstep(0.07, 0.16, curv)) * (1 - back) * (1 - stop);
  let pose: SkPose = mix(POSE.glide(0.3 + 0.25 * sstep(0.1, 0.25, curv), 1), POSE.stride(cad, 0.55), strideW);
  pose = mix(POSE.glide(0.7, -1), pose, sstep(23.5, 23.8, s));
  const duck = win(s, C.duck - 0.4, C.duck + 0.35, 0.3); if (duck > 0) { const dk = POSE.glide(1, 1); dk.hip = [0, -0.5, -0.1]; dk.spine = [0.95, 0, 0]; dk.head = [-0.95, 0.25, 0]; dk.hL = [0.22, -0.16, 0.24, 0]; dk.hR = [-0.24, -0.2, 0.12, 0]; pose = mix(pose, dk, duck); }
  const hk = win(s, C.hop - 0.3, C.hop + 0.26, 0.12); if (hk > 0) pose = mix(pose, seq([[C.hop - 0.34, POSE.glide(0.6, 1)], [C.hop - 0.17, mix(POSE.glide(0.6, 1), POSE.tuck(), 0.6)], [C.hop - 0.08, POSE.launch()], [C.hop + 0.04, POSE.air(0.6)], [C.hop + 0.16, POSE.reach()], [C.hop + 0.26, mix(POSE.glide(0.4, 1), POSE.land(), 0.45)]], s), hk);
  const wide = Math.max(win(s, C.pad - 0.9, C.pad + 0.9, 0.5), back * 0.8); if (wide > 0) { const w = POSE.glide(0.12, 1); w.hL = [0.4, 0.06 + 0.05 * Math.sin(s * 3), 0.02, 0]; w.hR = [-0.4, 0.04 - 0.05 * Math.sin(s * 3), 0.02, 0]; w.curl = [0.05, 0.05]; w.head = [-0.28, back * 0.9, 0]; w.spine = [-0.02, back * 0.3, 0]; pose = mix(pose, w, wide); }
  const sp = win(s, C.spin - 0.7, C.spin + 0.7, 0.25); if (sp > 0) { const p = POSE.glide(0.35, 1); p.hL = [0.1, -0.16, 0.26, 0]; p.hR = [-0.1, -0.2, 0.26, 0]; p.fL = [0.07, 0, 0.14, 0.5, 0, 0]; p.fR = [-0.07, 0, -0.14, 0.5, 0, 0]; pose = mix(pose, p, sp); }
  if (stop > 0) { const hs = POSE.glide(0.75, 1); hs.fL = [0.2, 0, 0.05, 0.1, 0, 0.25]; hs.fR = [-0.2, 0, 0, -0.1, 0, 0.25]; hs.hL = [0.34, -0.12, 0.1, 0]; hs.hR = [-0.34, -0.14, 0.02, 0]; pose = mix(pose, mix(hs, POSE.stand(), sstep(tDec + 1.0, tDec + 1.5, s)), sstep(tDec, tDec + 0.5, s)); }
  const face = faceMix(faceMix(FACE.mischief, FACE.grin, sstep(25, 26.5, s)), FACE.joy, Math.max(wide, sp * 0.8));
  return { root, pose, dist: 49 + d, speed: v, face: s > tDec + 0.8 ? faceMix(face, FACE.surprised, sstep(tDec + 0.9, tDec + 1.4, s) * 0.5) : face, hp: 1 };
}

// ───────────────────────────── D: ledge → bank → bus roof → High Walk
/** the frozen bus, mid right-turn out of Harbor Ave: centre, heading and body roll (west/left side low) */
export const BUS = { x: 51.13, z: 6.54, yaw: Math.PI - 0.435, roll: -0.21, roofY: 3.05 };
/** height of the tilted bus roof under world (x,z) */
export function busRoofY(x: number, z: number) { const lx = (x - BUS.x) * Math.cos(BUS.yaw) - (z - BUS.z) * Math.sin(BUS.yaw); return BUS.roofY * Math.cos(BUS.roll) + lx * Math.sin(BUS.roll); }
const pathD = new Path([[-1.5, 7.3], [10, 7.3], [20, 7.3], [30, 7.3], [42.5, 7.3], [46, 7.34], [49.4, 7.45], [50.5, 7.8], [51.6, 8.35], [54.28, 10.09], [56.96, 11.83], [58.2, 13.6], [58.75, 16.2], [58.6, 19.5], [58.3, 23.5], [57.9, 26], [57.6, 27.8], [57.5, 29.5], [57.5, 31]]);
const N = (x: number, z: number) => pathD.near(x, z);
const dLT = N(19.3, 7.3), dLL = N(23.24, 7.3), dLO = N(30.6, 7.3), dB0 = N(34.15, 7.3), dB1 = N(42.5, 7.3), dR0 = N(49.4, 7.45), dR1 = N(51.6, 8.35), dDK = N(56.96, 11.83), dEnd = N(57.5, 29.5);
const vD = track([[0, 0.7], [1.5, 3.2], [6, 6.3], [12, 8.6], [17, 9.9], [dLT, 10.1], [dLL, 10], [dLO, 9.5], [dB0, 9.6], [dB1, 6.95], [dR0, 6.95], [dR1, 7.1], [dDK, 7.1], [dDK + 3, 6.6], [dDK + 8, 5.2], [dDK + 13, 2.8], [dEnd, 0.4]], 'l');
const mD = byDistance(vD, dEnd, 46);
/** story times of the beats in D */
export const D = { run: 46, ledgeTake: mD.tAt(dLT), ledgeOn: mD.tAt(dLL), ledgeOff: mD.tAt(dLO), bank0: mD.tAt(dB0), bankTop: mD.tAt(dB1), roofOn: mD.tAt(dR0), roofOff: mD.tAt(dR1), deck: mD.tAt(dDK), carved: mD.tAt(dDK + 6), end: mD.end, path: pathD, endPos: pathD.at(dEnd) };
const LEDGE_Y = CURB + L.ledge.height, ROOF0 = busRoofY(49.4, 7.45) + 0.02, ROOF1 = busRoofY(51.6, 8.35) + 0.02;

function heightD(s: number, d: number, x: number) {
  if (s < D.ledgeTake) return CURB;
  if (s < D.ledgeOn) return arc(s, D.ledgeTake, D.ledgeOn, CURB, LEDGE_Y);
  if (s < D.ledgeOff) return LEDGE_Y;
  if (s < D.bank0) return arc(s, D.ledgeOff, D.bank0, LEDGE_Y, bankY(34.15));
  if (s < D.bankTop) return bankY(x);
  if (s < D.roofOn) return arc(s, D.bankTop, D.roofOn, bankY(L.bank.x1), ROOF0);
  if (s < D.roofOff) return lerp(ROOF0, ROOF1, (d - dR0) / (dR1 - dR0));
  if (s < D.deck) return arc(s, D.roofOff, D.deck, ROOF1, L.highwalk.y);
  return L.highwalk.y;
}

export function segD(s: number): Perf {
  if (s < D.run) { const k = sstep(45.2, 45.9, s), pose = mix(POSE.stand(), POSE.glide(0.85, -1), k); return { root: { pos: new THREE.Vector3(-1.5, CURB, 7.3), yaw: EAST }, pose, dist: 0, speed: 0, face: faceMix(FACE.surprised, FACE.mischief, sstep(45, 45.6, s)), hp: 1, look: new THREE.Vector3(BUS.x, 2.4, BUS.z), lookW: 0.5 }; }
  if (s >= D.end) { const p = D.endPos; return { root: { pos: new THREE.Vector3(p.x, L.highwalk.y, p.y), yaw: 0 }, pose: POSE.stand(), dist: dEnd, speed: 0, face: FACE.grin, hp: 1 }; }
  const d = mD.dAt(s), v = mD.vAt(s), p = pathD.at(d), root = rootOn(pathD, d, s > D.deck ? v : 0, heightD(s, d, p.x));
  const side = sstep(D.ledgeTake + 0.05, D.ledgeOn - 0.03, s) - sstep(D.ledgeOff, D.bank0 - 0.06, s); root.spin = side * Math.PI / 2;      // frontside: chest to the street while grinding
  if (s > D.bank0 - 0.05 && s < D.bankTop + 0.1) root.pitch = -bankSlope(p.x) * 0.85 * sstep(D.bank0 - 0.05, D.bank0 + 0.2, s) * (1 - sstep(D.bankTop, D.bankTop + 0.1, s));
  if (s > D.roofOn && s < D.roofOff + 0.05) root.pitch = -0.16;
  const cad = integrate([[46, 1.2], [48, 1.6], [60, 1.6]], 0.5)(s), st = POSE.stride(cad, 1), gl = POSE.glide(0.45, 1);
  const gr = POSE.grind(); gr.hip[0] = 0.03 * Math.sin(s * 9); gr.hL[1] += 0.05 * Math.sin(s * 7); gr.hR[1] -= 0.05 * Math.sin(s * 7); gr.head = [-0.2, -1.0, 0]; gr.spine = [0.34, -0.35, 0];
  const grab = POSE.grab();
  const landLite = mix(gl, POSE.land(), 0.7);
  const pose = seq([
    [D.ledgeTake - 0.45, () => st], [D.ledgeTake - 0.18, POSE.tuck()], [D.ledgeTake + 0.02, POSE.launch()], [D.ledgeTake + 0.2, POSE.air(0.7)],
    [D.ledgeOn + 0.03, gr], [D.ledgeOff - 0.02, gr], [D.ledgeOff + 0.16, POSE.air(0.7)], [D.bank0 + 0.06, landLite], [D.bank0 + 0.35, gl], [D.bankTop - 0.45, gl],
    [D.bankTop - 0.2, mix(gl, POSE.tuck(), 0.75)], [D.bankTop + 0.03, POSE.launch()], [D.bankTop + 0.32, POSE.air(1)], [D.roofOn - 0.24, POSE.air(1)], [D.roofOn - 0.05, POSE.reach()],
    [D.roofOn + 0.09, POSE.land()], [D.roofOff - 0.09, POSE.tuck()], [D.roofOff + 0.03, POSE.launch()], [D.roofOff + 0.28, grab], [D.deck - 0.27, grab], [D.deck - 0.05, POSE.reach()],
    [D.deck + 0.14, POSE.land()], [D.deck + 0.9, gl], [D.end, gl],
  ], s);
  const cheer = win(s, D.deck + 1.5, D.deck + 2.6, 0.35); if (cheer > 0) { const c = POSE.glide(0.1, 1); c.hL = [0.2, 0.36, 0.08, 0]; c.hR = [-0.2, 0.36, 0.08, 0]; c.curl = [0.9, 0.9]; c.palmL = [0, 0, 1]; c.palmR = [0, 0, 1]; c.head = [-0.3, 0, 0]; c.spine = [-0.08, 0, 0]; Object.assign(pose, mix(pose, c, cheer)); }
  const out = mix(pose, POSE.stand(), sstep(D.end - 1.3, D.end - 0.1, s));
  const air = (s > D.bankTop && s < D.roofOn) || (s > D.roofOff && s < D.deck);
  const face = s < D.ledgeTake ? FACE.effort : air ? FACE.joy : s > D.deck + 0.6 ? faceMix(FACE.joy, FACE.grin, sstep(D.deck + 2.6, D.deck + 4, s)) : FACE.focus;
  return { root, pose: out, dist: d, speed: v, face, hp: 1 };
}
