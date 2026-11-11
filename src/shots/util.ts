/** Small deterministic animation utilities: keyframe tracks, speed integration, smooth ground paths. */
import * as THREE from 'three';

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** 0 → 1 → 0 window with soft edges */
export const win = (x: number, a: number, b: number, fade = 0.2) => sstep(a - fade, a, x) * (1 - sstep(b, b + fade, x));
export const G = 9.81;

/** Piecewise track through [time, value] keys; eased ('s' smoothstep per segment) or linear ('l'). Clamped outside. */
export function track(keys: [number, number][], mode: 's' | 'l' = 's') {
  return (t: number) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; const k = (t - t0) / (t1 - t0); return lerp(v0, v1, mode === 's' ? k * k * (3 - 2 * k) : k); }
    return keys[keys.length - 1][1];
  };
}
/** Exact integral of a piecewise-linear rate track: returns value(t) = v0 + ∫ rate. Extrapolates with the end rates. */
export function integrate(keys: [number, number][], v0 = 0) {
  const acc = [v0]; for (let i = 1; i < keys.length; i++) acc.push(acc[i - 1] + (keys[i][0] - keys[i - 1][0]) * (keys[i][1] + keys[i - 1][1]) / 2);
  const f = (t: number) => {
    if (t <= keys[0][0]) return v0 + (t - keys[0][0]) * keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, r0] = keys[i - 1], [t1, r1] = keys[i], dt = t - t0, r = lerp(r0, r1, dt / (t1 - t0)); return acc[i - 1] + dt * (r0 + r) / 2; }
    const n = keys.length - 1; return acc[n] + (t - keys[n][0]) * keys[n][1];
  };
  const rate = (t: number) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])); return keys[keys.length - 1][1]; };
  return Object.assign(f, { rate });
}

/** Smooth ground path (x,z) through waypoints, parameterised by arc length. yaw = heading (0 = +Z, +π/2 = +X). */
export class Path {
  private pts: THREE.Vector2[] = []; private len: number[] = [0]; length = 0;
  constructor(way: [number, number][], step = 0.1) {
    const c = new THREE.CatmullRomCurve3(way.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const n = Math.max(8, Math.ceil(c.getLength() / step));
    for (let i = 0; i <= n; i++) { const p = c.getPoint(i / n); this.pts.push(new THREE.Vector2(p.x, p.z)); if (i) this.len.push(this.len[i - 1] + this.pts[i].distanceTo(this.pts[i - 1])); }
    this.length = this.len[n];
  }
  /** position at arc length s (extrapolates straight beyond the ends) */
  at(s: number, out = new THREE.Vector2()) {
    const L = this.len, P = this.pts, n = P.length - 1;
    if (s <= 0) return out.copy(P[1]).sub(P[0]).normalize().multiplyScalar(s).add(P[0]);
    if (s >= this.length) return out.copy(P[n]).sub(P[n - 1]).normalize().multiplyScalar(s - this.length).add(P[n]);
    let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= s) lo = m; else hi = m; }
    return out.copy(P[lo]).lerp(P[hi], (s - L[lo]) / (L[hi] - L[lo]));
  }
  yaw(s: number, d = 0.35) { const a = this.at(s - d), b = this.at(s + d, new THREE.Vector2()); return Math.atan2(b.x - a.x, b.y - a.y); }
  /** signed curvature (1/m), + = turning toward her left */
  curv(s: number, d = 0.6) { let dy = this.yaw(s + d) - this.yaw(s - d); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); return dy / (2 * d); }
  /** arc length of the point on the path nearest to (x,z) (coarse scan) */
  near(x: number, z: number) { let best = 0, bd = 1e9; for (let i = 0; i < this.pts.length; i++) { const d = (this.pts[i].x - x) ** 2 + (this.pts[i].y - z) ** 2; if (d < bd) { bd = d; best = i; } } return this.len[best]; }
}

/** Ballistic height: launched at t0 from y0, landing at t1 on y1 under gravity g (so the arc is physically exact). */
export function arc(t: number, t0: number, t1: number, y0: number, y1: number, g = G) { const T = t1 - t0, vy = (y1 - y0 + 0.5 * g * T * T) / T, u = t - t0; return y0 + vy * u - 0.5 * g * u * u; }
/** Unwrap angle b to be the nearest equivalent to a. */
export const near = (a: number, b: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
