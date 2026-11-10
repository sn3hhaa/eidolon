/** Deterministic animation helpers: every value is a pure function of absolute film time. */
import * as THREE from 'three';

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0→1 as t goes a→b (clamped). */
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (x: number) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const smoother = (x: number) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const sramp = (t: number, a: number, b: number) => smooth(ramp(t, a, b));
export const easeIn = (x: number, p = 2) => Math.pow(clamp01(x), p);
export const easeOut = (x: number, p = 2) => 1 - Math.pow(1 - clamp01(x), p);
/** Bell: rises a→b, holds, falls c→d. */
export const bell = (t: number, a: number, b: number, c: number, d: number) => sramp(t, a, b) * (1 - sramp(t, c, d));
/** A soft pulse centred at c with half-width w. */
export const pulse = (t: number, c: number, w: number) => { const x = (t - c) / w; return Math.exp(-x * x * 2.5); };

export type Key = number[]; // [time, v0, v1, ...]

/**
 * C1 cubic-Hermite track through keyframes with time-aware (finite difference)
 * tangents — gives smooth, physically plausible camera/subject motion with
 * natural acceleration. End tangents are zero (ease in / out).
 */
export function track(keys: Key[]) {
  const n = keys.length, dim = keys[0].length - 1;
  const tang: number[][] = keys.map((k, i) => {
    if (i === 0 || i === n - 1) return new Array(dim).fill(0);
    const a = keys[i - 1], b = keys[i + 1];
    return k.slice(1).map((_, d) => (b[d + 1] - a[d + 1]) / (b[0] - a[0]));
  });
  const out = new Array<number>(dim);
  return (t: number): number[] => {
    if (t <= keys[0][0]) return keys[0].slice(1);
    if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 0;
    while (i < n - 2 && t > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], h = b[0] - a[0], s = (t - a[0]) / h;
    const s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    for (let d = 0; d < dim; d++) out[d] = h00 * a[d + 1] + h10 * h * tang[i][d] + h01 * b[d + 1] + h11 * h * tang[i + 1][d];
    return out.slice();
  };
}

/**
 * Spline camera: keys are [t, px,py,pz, lx,ly,lz, fov, roll(deg)].
 * fov/roll optional (default 40 / 0).
 */
export function camPath(keys: number[][]) {
  const full = keys.map((k) => [k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7] ?? 40, k[8] ?? 0]);
  const tr = track(full);
  const look = new THREE.Vector3();
  return (cam: THREE.PerspectiveCamera, t: number) => {
    const v = tr(t);
    cam.position.set(v[0], v[1], v[2]);
    look.set(v[3], v[4], v[5]);
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    if (v[7]) cam.rotateZ((v[7] * Math.PI) / 180);
    if (cam.fov !== v[6]) { cam.fov = v[6]; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    return v;
  };
}

/** Seeded RNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Object.assign(f, {
    range: (a2: number, b: number) => a2 + (b - a2) * f(),
    pick: <T,>(arr: T[]): T => arr[Math.floor(f() * arr.length)],
    sign: () => (f() < 0.5 ? -1 : 1),
  });
}
