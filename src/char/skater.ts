/**
 * Skating performance: a small pose vocabulary for inline skating (stride cycle, glide, tuck, air,
 * landing, grind…) expressed as IK targets in the skater's root frame, and the solver that puts
 * the protagonist into a pose. Root frame: origin on the ground under her, x = her left, y = up,
 * z = direction she faces. Everything is a pure function of its inputs.
 */
import * as THREE from 'three';
import type { Protagonist } from './wardrobe';
import { SKATE_DROP, WHEEL_R } from './skates';

/** foot = [x, y, z, yaw, pitch, roll] of the skate's wheel-contact centre; hand = [x, y, z, mode] (mode 0: offset from the shoulder, 1: root-frame point, 2: world point) */
export interface SkPose { hip: number[]; hipRot: number[]; spine: number[]; head: number[]; fL: number[]; fR: number[]; hL: number[]; hR: number[]; curl: number[]; elbow?: number[]; /** palm normals in the root frame (optional; default: palms turn toward the body) */ palmL?: number[]; palmR?: number[] }
const KEYS = ['hip', 'hipRot', 'spine', 'head', 'fL', 'fR', 'hL', 'hR', 'curl'] as const;
const TAU = Math.PI * 2;
export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const F = (x: number, y: number, z: number, yaw = 0, pitch = 0, roll = 0) => [x, y, z, yaw, pitch, roll];

export function mix(a: SkPose, b: SkPose, t: number): SkPose {
  if (t <= 0) return a; if (t >= 1) return b;
  const o: any = {};
  for (const k of KEYS) { const x = a[k], y = b[k]; o[k] = x.map((v, i) => (k[0] === 'h' && k.length === 2 && i === 3 ? (t < 0.5 ? v : y[i]) : lerp(v, y[i] ?? v, t))); }
  const pk = t < 0.5 ? a : b; o.elbow = pk.elbow; o.palmL = pk.palmL; o.palmR = pk.palmR;
  // hands in different target modes cannot be interpolated numerically: resolved in apply() via hLb/hRb
  if ((a.hL[3] ?? 0) !== (b.hL[3] ?? 0)) { o.hL = a.hL; o.hLb = [b.hL, t]; }
  if ((a.hR[3] ?? 0) !== (b.hR[3] ?? 0)) { o.hR = a.hR; o.hRb = [b.hR, t]; }
  return o;
}
/** Blend a list of [pose, weight] (weights need not sum to 1). */
export function blend(list: [SkPose, number][]): SkPose { let acc = list[0][0], w = list[0][1]; for (let i = 1; i < list.length; i++) { const [p, pw] = list[i]; if (pw <= 0) continue; w += pw; acc = mix(acc, p, pw / w); } return acc; }

export type PoseSrc = SkPose | (() => SkPose);
/** Pose-to-pose track: Catmull-Rom through timed key poses, so motion flows through each key without stopping. */
export function seq(keys: [number, PoseSrc][], t: number): SkPose {
  const n = keys.length, ev = (k: number) => { const p = keys[Math.min(n - 1, Math.max(0, k))][1]; return typeof p === 'function' ? p() : p; };
  if (t <= keys[0][0]) return ev(0); if (t >= keys[n - 1][0]) return ev(n - 1);
  let i = 0; while (i < n - 2 && t >= keys[i + 1][0]) i++;
  const T = (k: number) => keys[Math.min(n - 1, Math.max(0, k))][0], t1 = T(i), t2 = T(i + 1), x = (t - t1) / (t2 - t1), x2 = x * x, x3 = x2 * x, p0 = ev(i - 1), p1 = ev(i), p2 = ev(i + 1), p3 = ev(i + 2), o: any = {};
  for (const k of KEYS) {
    const hand = k === 'hL' || k === 'hR', same = !hand || ((p0[k][3] ?? 0) === (p1[k][3] ?? 0) && (p1[k][3] ?? 0) === (p2[k][3] ?? 0) && (p2[k][3] ?? 0) === (p3[k][3] ?? 0));
    o[k] = p1[k].map((v, c) => { if (hand && c === 3) return x < 0.5 ? v : p2[k][c]; const w = p2[k][c] ?? v; if (!same) return lerp(v, w, x2 * (3 - 2 * x));
      const m1 = i > 0 ? ((w - (p0[k][c] ?? v)) / (t2 - T(i - 1))) * (t2 - t1) : w - v, m2 = i < n - 2 ? (((p3[k][c] ?? w) - v) / (T(i + 2) - t1)) * (t2 - t1) : w - v;
      return (2 * x3 - 3 * x2 + 1) * v + (x3 - 2 * x2 + x) * m1 + (-2 * x3 + 3 * x2) * w + (x3 - x2) * m2; });
  }
  const sm = x2 * (3 - 2 * x);
  if ((p1.hL[3] ?? 0) !== (p2.hL[3] ?? 0)) { o.hL = p1.hL; o.hLb = [p2.hL, sm]; } if ((p1.hR[3] ?? 0) !== (p2.hR[3] ?? 0)) { o.hR = p1.hR; o.hRb = [p2.hR, sm]; }
  const pk = x < 0.5 ? p1 : p2; o.elbow = pk.elbow; o.palmL = pk.palmL; o.palmR = pk.palmR;
  return o;
}

export const POSE = {
  stand: (): SkPose => ({ hip: [0, -0.03, 0], hipRot: [0, 0, 0], spine: [0.04, 0, 0], head: [0, 0, 0], fL: F(0.1, 0, 0, 0.16), fR: F(-0.1, 0, 0, -0.16), hL: [0.17, -0.43, 0.05, 0], hR: [-0.17, -0.43, 0.05, 0], curl: [0.35, 0.35] }),
  /** rolling stance; c = crouch 0..1, lead = +1 left foot forward */
  glide: (c = 0.2, lead = 1): SkPose => ({ hip: [0, -0.07 - 0.26 * c, -0.03 * c], hipRot: [0.1 + 0.3 * c, 0, 0], spine: [0.14 + 0.5 * c, 0, 0], head: [-0.12 - 0.42 * c, 0, 0], fL: F(0.095, 0, 0.11 * lead, 0.04), fR: F(-0.095, 0, -0.11 * lead, -0.04), hL: [0.2 + 0.05 * c, -0.34 + 0.1 * c, 0.2, 0], hR: [-0.2 - 0.05 * c, -0.34 + 0.1 * c, 0.16, 0], curl: [0.4, 0.4] }),
  /** one full stride cycle; ph in cycles (left leg leads the phase), pw = power 0.3 (cruise) … 1 (sprint) */
  stride: (ph: number, pw = 0.6): SkPose => {
    // one leg's cycle as a periodic spline through keys (glide, push out and back, lift and recover): no velocity jumps
    const zf = 0.12 * (0.6 + 0.4 * pw), zb = -0.16 - 0.2 * pw, xo = 0.2 + 0.2 * pw, hh = 0.07 + 0.07 * pw;
    const K: number[][] = [[0, 0.09, 0, zf, 0.08, 0, -0.04], [0.25, 0.09, 0, zf * 0.5 - 0.015, 0.17, 0, 0.03], [0.5, 0.09, 0, -0.03, 0.26, 0, 0.1], [0.64, (0.09 + xo) / 2, 0, (zb - 0.03) / 2, 0.38, 0, 0.2], [0.78, xo, 0, zb, 0.5, 0.06, 0.3], [0.89, (xo + 0.09) / 2, hh, (zb + zf) / 2, 0.29, 0.45, 0.13]];
    const leg = (u: number, sd: number) => {
      u = ((u % 1) + 1) % 1; const n = K.length; let i = n - 1; for (let k = 0; k < n; k++) if (u >= K[k][0]) i = k;
      const P = (k: number) => K[((k % n) + n) % n], T = (k: number) => P(k)[0] + Math.floor(k / n), t1 = T(i), t2 = T(i + 1), x = (u - t1) / (t2 - t1), o: number[] = [];
      for (let c = 1; c < 7; c++) { const m1 = (P(i + 1)[c] - P(i - 1)[c]) / (T(i + 1) - T(i - 1)) * (t2 - t1), m2 = (P(i + 2)[c] - P(i)[c]) / (T(i + 2) - T(i)) * (t2 - t1), x2 = x * x, x3 = x2 * x; o.push((2 * x3 - 3 * x2 + 1) * P(i)[c] + (x3 - 2 * x2 + x) * m1 + (-2 * x3 + 3 * x2) * P(i + 1)[c] + (x3 - x2) * m2); }
      return F(sd * o[0], Math.max(0, o[1]), o[2], sd * o[3], o[4], -sd * o[5]);
    };
    const sw = Math.sin(TAU * ph), aL = Math.cos(TAU * (ph - 0.64)), arm = (a: number, s: number) => { const k = (a + 1) / 2; return [s * lerp(0.2, 0.1, k), lerp(-0.31, -0.2, k) + 0.06 * pw * k, lerp(-0.12 - 0.1 * pw, 0.24 + 0.14 * pw, k), 0]; };
    return { hip: [0.055 * sw * (0.6 + 0.4 * pw), -0.12 - 0.12 * pw - 0.025 * Math.cos(2 * TAU * ph), -0.02], hipRot: [0.22 + 0.2 * pw, -0.13 * Math.cos(TAU * (ph - 0.6)) * pw, 0.05 * sw], spine: [0.3 + 0.32 * pw, 0.2 * Math.cos(TAU * (ph - 0.6)) * pw, -0.06 * sw], head: [-0.34 - 0.34 * pw, -0.07 * Math.cos(TAU * (ph - 0.6)) * pw, 0], fL: leg(ph, 1), fR: leg(ph + 0.5, -1), hL: arm(aL, 1), hR: arm(-aL, -1), curl: [0.55, 0.55] };
  },
  /** deep anticipation crouch before a jump */
  tuck: (): SkPose => ({ hip: [0, -0.4, -0.07], hipRot: [0.55, 0, 0], spine: [0.72, 0, 0], head: [-0.75, 0, 0], fL: F(0.1, 0, 0.07, 0.05), fR: F(-0.1, 0, -0.05, -0.05), hL: [0.23, -0.3, -0.12, 0], hR: [-0.23, -0.3, -0.12, 0], curl: [0.6, 0.6] }),
  /** full extension at take-off, arms thrown up and forward */
  launch: (): SkPose => ({ hip: [0, 0.0, 0.03], hipRot: [-0.05, 0, 0], spine: [-0.08, 0, 0], head: [-0.05, 0, 0], fL: F(0.09, 0, 0.02, 0.05, 0.25), fR: F(-0.09, 0, -0.04, -0.05, 0.35), hL: [0.2, 0.18, 0.26, 0], hR: [-0.2, 0.12, 0.26, 0], curl: [0.3, 0.3] }),
  /** knees drawn up in the air */
  air: (k = 1): SkPose => ({ hip: [0, 0.0, 0], hipRot: [0.15 * k, 0, 0], spine: [0.3 * k, 0, 0], head: [-0.3 * k, 0, 0], fL: F(0.11, 0.3 * k, 0.1 * k, 0.1, 0.25 * k), fR: F(-0.11, 0.24 * k, -0.02, -0.1, 0.35 * k), hL: [0.3, 0.02, 0.12, 0], hR: [-0.3, 0.0, 0.1, 0], curl: [0.25, 0.25] }),
  /** mute grab: both skates swung to her left, right hand reaches across to the left skate, left arm thrown out */
  grab: (): SkPose => ({ hip: [0, 0.02, 0], hipRot: [0.3, 0.25, 0.1], spine: [0.5, -0.5, -0.1], head: [-0.25, 0.3, 0], fL: F(0.2, 0.4, 0.16, 0.5, 0.2, -0.3), fR: F(0.0, 0.36, 0.02, 0.4, 0.3, -0.3), hL: [0.36, 0.2, -0.12, 0], hR: [0.21, 0.5, 0.2, 1], curl: [0.1, 0.8] }),
  /** legs reaching for the ground, arms wide */
  reach: (): SkPose => ({ hip: [0, -0.02, 0], hipRot: [0.05, 0, 0], spine: [0.12, 0, 0], head: [-0.1, 0, 0], fL: F(0.12, 0.02, 0.1, 0.06, -0.12), fR: F(-0.12, 0.0, -0.08, -0.06, -0.05), hL: [0.36, 0.0, 0.05, 0], hR: [-0.36, -0.04, 0.02, 0], curl: [0.2, 0.2] }),
  /** landing compression */
  land: (): SkPose => ({ hip: [0, -0.43, -0.08], hipRot: [0.5, 0, 0], spine: [0.62, 0, 0], head: [-0.6, 0, 0], fL: F(0.13, 0, 0.14, 0.08), fR: F(-0.13, 0, -0.1, -0.08), hL: [0.34, -0.14, 0.12, 0], hR: [-0.34, -0.16, 0.0, 0], curl: [0.3, 0.3] }),
  /** sideways grind stance (rotate the root 90° to the direction of travel); feet across the ledge */
  grind: (): SkPose => ({ hip: [0, -0.27, 0.02], hipRot: [0.28, 0, 0], spine: [0.34, 0, 0], head: [-0.25, 0, 0], fL: F(0.25, 0, 0, 0.12, 0, 0.1), fR: F(-0.23, 0, 0, -0.12, 0, -0.1), hL: [0.38, -0.02, 0.06, 0], hR: [-0.38, -0.06, 0.04, 0], curl: [0.2, 0.2] }),
  /** T-stop: right skate dragged sideways behind */
  brake: (): SkPose => ({ hip: [0.02, -0.16, -0.04], hipRot: [0.1, -0.2, 0], spine: [0.06, 0.1, 0], head: [-0.05, 0, 0], fL: F(0.06, 0, 0.14, 0.05), fR: F(-0.1, 0, -0.26, -1.25, 0, -0.25), hL: [0.26, -0.2, 0.14, 0], hR: [-0.3, -0.22, 0.06, 0], curl: [0.3, 0.3] }),
};

export interface Root { pos: THREE.Vector3; yaw: number; pitch?: number; roll?: number; /** extra turn of the body about its own vertical axis, applied after the lean (spins, fakie, sideways grinds) */ spin?: number; /** extra rotation about the body's centre of mass (aerials) */ tumble?: THREE.Quaternion }
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _c = new THREE.Vector3(0, 0.98, 0);

/** Put the protagonist into `pose` at `root`. `dist` is the distance rolled (for wheel spin). */
export function applyPose(P: Protagonist, root: Root, pose: SkPose, dist = 0) {
  const a = P.actor, R = a.root;
  R.quaternion.setFromEuler(_e.set(root.pitch ?? 0, root.yaw, root.roll ?? 0, 'YXZ')); R.position.copy(root.pos);
  if (root.spin) R.quaternion.multiply(_q.setFromEuler(_e.set(0, root.spin, 0, 'YXZ')));
  if (root.tumble) { R.position.add(_v.copy(_c).applyQuaternion(R.quaternion)); R.quaternion.multiply(root.tumble); R.position.sub(_v.copy(_c).applyQuaternion(R.quaternion)); }
  a.pose();
  a.hipShift(pose.hip[0], pose.hip[1], pose.hip[2]); a.rot('hips', pose.hipRot[0], pose.hipRot[1], pose.hipRot[2]);
  const [sp, sy, sr] = pose.spine; a.rot('spine', sp * 0.3, sy * 0.3, sr * 0.3); a.rot('chest', sp * 0.35, sy * 0.35, sr * 0.35); a.rot('upperChest', sp * 0.35, sy * 0.35, sr * 0.35);
  a.rot('neck', pose.head[0] * 0.4, pose.head[1] * 0.4, pose.head[2] * 0.4); a.rot('head', pose.head[0] * 0.6, pose.head[1] * 0.6, pose.head[2] * 0.6);
  a.rot('leftUpperArm', 0, 0, -1.2); a.rot('rightUpperArm', 0, 0, 1.2); a.rot('leftLowerArm', 0, 0.35, 0); a.rot('rightLowerArm', 0, -0.35, 0);
  R.updateMatrixWorld(true);
  const rq = R.getWorldQuaternion(new THREE.Quaternion());
  for (const [side, f, s] of [['left', pose.fL, 1], ['right', pose.fR, -1]] as const) {
    const fq = new THREE.Quaternion().setFromEuler(_e.set(f[4], f[3], f[5], 'YXZ'));
    const ankle = new THREE.Vector3(0, SKATE_DROP, -0.047).applyQuaternion(fq).add(_v.set(f[0], f[1], f[2])); R.localToWorld(ankle);
    const pole = new THREE.Vector3(s * 0.12, 0, 1).applyQuaternion(fq).applyQuaternion(rq);
    a.legIK(side, ankle, pole, _q.copy(rq).multiply(fq).clone());
  }
  const hand = (side: 'left' | 'right', h: number[]) => { const t = new THREE.Vector3(h[0], h[1], h[2]); if (h[3] === 2) return t; if (h[3] === 1) return R.localToWorld(t); return t.applyQuaternion(rq).add(a.worldPos(`${side}UpperArm`, _v)); };
  // torso frame for keeping hands outside the body and jacket
  const inv = a.restQ.clone().invert(), cq = a.nb.upperChest.getWorldQuaternion(new THREE.Quaternion()).multiply(inv);
  const cx = new THREE.Vector3(1, 0, 0).applyQuaternion(cq), cz = new THREE.Vector3(0, 0, 1).applyQuaternion(cq), cy = new THREE.Vector3(0, 1, 0).applyQuaternion(cq);
  const segA = a.worldPos('hips', new THREE.Vector3()).addScaledVector(cy, -0.14), segB = a.worldPos('upperChest', new THREE.Vector3()).addScaledVector(cy, 0.1), seg = segB.clone().sub(segA), segL2 = seg.lengthSq();
  const legs = (['left', 'right'] as const).map((sd) => [a.worldPos(sd + 'UpperLeg', new THREE.Vector3()), a.worldPos(sd + 'LowerLeg', new THREE.Vector3())]);
  const clear = (t: THREE.Vector3, sgn: number) => {
    const kr = t.clone().sub(segA).dot(seg) / segL2, k = THREE.MathUtils.clamp(kr, 0, 1), d = t.clone().sub(segA).addScaledVector(seg, -k), lx = d.dot(cx), lz = d.dot(cz), e = Math.hypot(lx / 0.285, lz / 0.225);
    if (e < 1 && kr > -0.1 && kr < 1.12) { if (e < 0.05) t.addScaledVector(cx, sgn * 0.285); else { t.addScaledVector(cx, lx * (1 / e - 1)); t.addScaledVector(cz, lz * (1 / e - 1)); } }
    for (const [p, q] of legs) { const ab = q.clone().sub(p), kk = THREE.MathUtils.clamp(t.clone().sub(p).dot(ab) / ab.lengthSq(), 0, 1), dd = t.clone().sub(p).addScaledVector(ab, -kk), l = dd.length(); if (l < 0.155 && l > 1e-4) t.addScaledVector(dd, 0.155 / l - 1); }
    return t;
  };
  for (const [side, h, hb, s, palm] of [['left', pose.hL, (pose as any).hLb, 1, pose.palmL], ['right', pose.hR, (pose as any).hRb, -1, pose.palmR]] as const) {
    const t = hand(side, h); if (hb) { const w = sstep(0, 1, hb[1]); t.lerp(hand(side, hb[0]), w); t.addScaledVector(cz, 0.26 * Math.sin(Math.PI * w)).addScaledVector(cx, s * 0.05 * Math.sin(Math.PI * w)); }   // hands travel round the front of the body, never behind the shoulders
    if (h[3] !== 2) clear(t, s);
    const e = pose.elbow ?? [0.8, -0.5, -0.38];
    a.armIK(side, t, _v.set(s * e[0], e[1], e[2]).applyQuaternion(rq).clone());
    // wrist: fingers continue the forearm, palm turned toward the body (or down when the arm is out wide); the forearm takes the twist
    const Lo = a.nb[side + 'LowerArm'], Hd = a.nb[side + 'Hand']; Lo.updateWorldMatrix(true, true);
    const el = Lo.getWorldPosition(new THREE.Vector3()), wr = Hd.getWorldPosition(new THREE.Vector3()), d = wr.clone().sub(el).normalize();
    let n: THREE.Vector3;
    if (palm) n = new THREE.Vector3(palm[0], palm[1], palm[2]).applyQuaternion(rq);
    else { const mid = segA.clone().lerp(segB, 0.45), inw = mid.sub(wr), far = inw.length(); inw.normalize(); n = inw.addScaledVector(new THREE.Vector3(0, -1, 0), THREE.MathUtils.clamp((far - 0.3) / 0.18, 0.15, 2)); }
    n.addScaledVector(d, -n.dot(d)); if (n.lengthSq() < 1e-6) n.set(0, -1, 0).addScaledVector(d, d.y); n.normalize();
    const f2 = n.clone().negate(), f3 = d.clone().cross(f2), F4 = new THREE.Matrix4().makeBasis(d, f2, f3), E4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(s, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, s));
    const Rw = new THREE.Quaternion().setFromRotationMatrix(F4.multiply(E4.transpose()));
    const lq = Lo.getWorldQuaternion(new THREE.Quaternion()), b0 = new THREE.Vector3(0, 1, 0).applyQuaternion(lq.clone().multiply(inv)); b0.addScaledVector(d, -b0.dot(d)).normalize();
    const th = Math.atan2(b0.clone().cross(f2).dot(d), b0.dot(f2));
    a.setWorldQuat(Lo, new THREE.Quaternion().setFromAxisAngle(d, th * 0.9).multiply(lq)); Lo.updateWorldMatrix(false, true);
    a.setWorldQuat(Hd, Rw.multiply(a.restQ)); Hd.updateWorldMatrix(false, true);
  }
  a.fingers('left', pose.curl[0]); a.fingers('right', pose.curl[1]);
  const spin = dist / WHEEL_R;
  for (const w of P.skates.left.wheels) w.rotation.x = spin; for (const w of P.skates.right.wheels) w.rotation.x = spin;
}

/** Deterministic blink track: returns 0..1 eyelid closure at time t. */
export function blink(t: number, seed = 0) { const period = 3.1, u = (t + seed * 1.7) % period, v = (t * 0.83 + seed) % 7.3; const b = (x: number) => (x < 0.07 ? x / 0.07 : x < 0.16 ? 1 - (x - 0.07) / 0.09 : 0); return Math.max(b(u), b(v)); }
