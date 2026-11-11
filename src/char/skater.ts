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
export interface SkPose { hip: number[]; hipRot: number[]; spine: number[]; head: number[]; fL: number[]; fR: number[]; hL: number[]; hR: number[]; curl: number[]; elbow?: number[] }
const KEYS = ['hip', 'hipRot', 'spine', 'head', 'fL', 'fR', 'hL', 'hR', 'curl'] as const;
const TAU = Math.PI * 2;
export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const F = (x: number, y: number, z: number, yaw = 0, pitch = 0, roll = 0) => [x, y, z, yaw, pitch, roll];

export function mix(a: SkPose, b: SkPose, t: number): SkPose {
  if (t <= 0) return a; if (t >= 1) return b;
  const o: any = {};
  for (const k of KEYS) { const x = a[k], y = b[k]; o[k] = x.map((v, i) => (k[0] === 'h' && k.length === 2 && i === 3 ? (t < 0.5 ? v : y[i]) : lerp(v, y[i] ?? v, t))); }
  // hands in different target modes cannot be interpolated numerically: resolved in apply() via hLb/hRb
  if ((a.hL[3] ?? 0) !== (b.hL[3] ?? 0)) { o.hL = a.hL; o.hLb = [b.hL, t]; }
  if ((a.hR[3] ?? 0) !== (b.hR[3] ?? 0)) { o.hR = a.hR; o.hRb = [b.hR, t]; }
  return o;
}
/** Blend a list of [pose, weight] (weights need not sum to 1). */
export function blend(list: [SkPose, number][]): SkPose { let acc = list[0][0], w = list[0][1]; for (let i = 1; i < list.length; i++) { const [p, pw] = list[i]; if (pw <= 0) continue; w += pw; acc = mix(acc, p, pw / w); } return acc; }

export const POSE = {
  stand: (): SkPose => ({ hip: [0, -0.03, 0], hipRot: [0, 0, 0], spine: [0.04, 0, 0], head: [0, 0, 0], fL: F(0.1, 0, 0, 0.16), fR: F(-0.1, 0, 0, -0.16), hL: [0.07, -0.41, 0.03, 0], hR: [-0.07, -0.41, 0.03, 0], curl: [0.35, 0.35] }),
  /** rolling stance; c = crouch 0..1, lead = +1 left foot forward */
  glide: (c = 0.2, lead = 1): SkPose => ({ hip: [0, -0.07 - 0.26 * c, -0.03 * c], hipRot: [0.1 + 0.3 * c, 0, 0], spine: [0.14 + 0.5 * c, 0, 0], head: [-0.12 - 0.42 * c, 0, 0], fL: F(0.095, 0, 0.11 * lead, 0.04), fR: F(-0.095, 0, -0.11 * lead, -0.04), hL: [0.1 + 0.05 * c, -0.37 + 0.1 * c, 0.1, 0], hR: [-0.1 - 0.05 * c, -0.37 + 0.1 * c, 0.06, 0], curl: [0.4, 0.4] }),
  /** one full stride cycle; ph in cycles (left leg leads the phase), pw = power 0.3 (cruise) … 1 (sprint) */
  stride: (ph: number, pw = 0.6): SkPose => {
    const leg = (u: number, s: number) => {
      u = ((u % 1) + 1) % 1;
      if (u < 0.5) { const k = u / 0.5; return F(s * 0.09, 0, lerp(0.12, -0.03, k) * (0.6 + 0.4 * pw), s * lerp(0.08, 0.26, k), 0, -s * lerp(-0.04, 0.1, k)); }
      if (u < 0.78) { const k = sstep(0, 1, (u - 0.5) / 0.28); return F(s * lerp(0.09, 0.2 + 0.2 * pw, k), 0, lerp(-0.03, -0.16 - 0.2 * pw, k), s * lerp(0.26, 0.5, k), 0, -s * lerp(0.1, 0.3, k)); }
      const k = (u - 0.78) / 0.22, e = sstep(0, 1, k);
      return F(s * lerp(0.2 + 0.2 * pw, 0.09, e), Math.sin(k * Math.PI) * (0.07 + 0.07 * pw), lerp(-0.16 - 0.2 * pw, 0.12 * (0.6 + 0.4 * pw), e), s * lerp(0.5, 0.08, e), Math.sin(k * Math.PI) * 0.45, -s * lerp(0.3, -0.04, e));
    };
    const sw = Math.sin(TAU * ph), aL = Math.cos(TAU * (ph - 0.64)), arm = (a: number, s: number) => { const k = (a + 1) / 2; return [s * lerp(0.13, -0.05, k), lerp(-0.3, -0.2, k) + 0.06 * pw * k, lerp(-0.2 - 0.14 * pw, 0.2 + 0.14 * pw, k), 0]; };
    return { hip: [0.055 * sw * (0.6 + 0.4 * pw), -0.12 - 0.12 * pw - 0.025 * Math.cos(2 * TAU * ph), -0.02], hipRot: [0.22 + 0.2 * pw, -0.13 * Math.cos(TAU * (ph - 0.6)) * pw, 0.05 * sw], spine: [0.3 + 0.32 * pw, 0.2 * Math.cos(TAU * (ph - 0.6)) * pw, -0.06 * sw], head: [-0.34 - 0.34 * pw, -0.07 * Math.cos(TAU * (ph - 0.6)) * pw, 0], fL: leg(ph, 1), fR: leg(ph + 0.5, -1), hL: arm(aL, 1), hR: arm(-aL, -1), curl: [0.55, 0.55] };
  },
  /** deep anticipation crouch before a jump */
  tuck: (): SkPose => ({ hip: [0, -0.4, -0.07], hipRot: [0.55, 0, 0], spine: [0.72, 0, 0], head: [-0.75, 0, 0], fL: F(0.1, 0, 0.07, 0.05), fR: F(-0.1, 0, -0.05, -0.05), hL: [0.16, -0.2, -0.3, 0], hR: [-0.16, -0.2, -0.3, 0], curl: [0.6, 0.6] }),
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
  brake: (): SkPose => ({ hip: [0.02, -0.16, -0.04], hipRot: [0.1, -0.2, 0], spine: [0.06, 0.1, 0], head: [-0.05, 0, 0], fL: F(0.06, 0, 0.14, 0.05), fR: F(-0.1, 0, -0.26, -1.25, 0, -0.25), hL: [0.26, -0.2, 0.1, 0], hR: [-0.3, -0.22, -0.06, 0], curl: [0.3, 0.3] }),
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
  for (const [side, h, hb, s] of [['left', pose.hL, (pose as any).hLb, 1], ['right', pose.hR, (pose as any).hRb, -1]] as const) {
    const t = hand(side, h); if (hb) t.lerp(hand(side, hb[0]), sstep(0, 1, hb[1]));
    const e = pose.elbow ?? [0.35, -0.55, -0.75];
    a.armIK(side, t, _v.set(s * e[0], e[1], e[2]).applyQuaternion(rq).clone());
  }
  a.fingers('left', pose.curl[0]); a.fingers('right', pose.curl[1]);
  const spin = dist / WHEEL_R;
  for (const w of P.skates.left.wheels) w.rotation.x = spin; for (const w of P.skates.right.wheels) w.rotation.x = spin;
}

/** Deterministic blink track: returns 0..1 eyelid closure at time t. */
export function blink(t: number, seed = 0) { const period = 3.1, u = (t + seed * 1.7) % period, v = (t * 0.83 + seed) % 7.3; const b = (x: number) => (x < 0.07 ? x / 0.07 : x < 0.16 ? 1 - (x - 0.07) / 0.09 : 0); return Math.max(b(u), b(v)); }
