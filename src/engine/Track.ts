import gsap from 'gsap';

/**
 * A keyframed scalar track evaluated as a PURE function of time.
 *
 * GSAP is used only for its easing library (gsap.parseEase) — no tweens, no
 * tickers — so evaluating a track at time t always gives the same value
 * regardless of playback history. This is what makes seeking and offline
 * frame export deterministic.
 */
export type Key = [t: number, value: number, ease?: string];

type EaseFn = (x: number) => number;
const linear: EaseFn = (x) => x;
const easeCache = new Map<string, EaseFn>();

export function easeFn(name?: string): EaseFn {
  if (!name || name === 'none' || name === 'linear') return linear;
  let fn = easeCache.get(name);
  if (!fn) {
    fn = gsap.parseEase(name) as EaseFn;
    if (typeof fn !== 'function') throw new Error(`Unknown ease "${name}"`);
    easeCache.set(name, fn);
  }
  return fn;
}

export class Track {
  private readonly ts: number[] = [];
  private readonly vs: number[] = [];
  private readonly es: EaseFn[] = [];

  /** Each key's ease shapes the segment ARRIVING at that key. */
  constructor(...keys: Key[]) {
    if (keys.length === 0) throw new Error('Track needs at least one key');
    for (const [t, v, e] of keys) {
      if (this.ts.length && t < this.ts[this.ts.length - 1]) {
        throw new Error('Track keys must be in ascending time order');
      }
      this.ts.push(t);
      this.vs.push(v);
      this.es.push(easeFn(e));
    }
  }

  at(t: number): number {
    const { ts, vs, es } = this;
    const n = ts.length;
    if (t <= ts[0]) return vs[0];
    if (t >= ts[n - 1]) return vs[n - 1];
    let i = 0;
    while (i < n - 2 && t >= ts[i + 1]) i++;
    const span = ts[i + 1] - ts[i];
    const u = span > 0 ? (t - ts[i]) / span : 1;
    return vs[i] + (vs[i + 1] - vs[i]) * es[i + 1](u);
  }
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
