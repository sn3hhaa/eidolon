/** Shared types and helpers for the performance segments (kept separate to avoid import cycles). */
import * as THREE from 'three';
import type { SkPose, Root } from '../char/skater';
import type { Face } from '../char/actor';
import { SKATE_LIFT } from '../char/skates';
import { Path, lerp, G } from './util';

export const BALL = new THREE.Vector3(-11.0, 1.6, 5.15);
export interface Perf {
  root: Root; pose: SkPose; dist: number; speed: number; face: Face;
  /** world point the head/eyes aim at, with head weight (0 = eyes only) */
  look?: THREE.Vector3; lookW?: number;
  /** headphones: 0 on her ears … 1 resting round her neck */
  hp: number;
  /** extra roll distance for the left skate only (rocking it on the spot) */
  wheelL?: number;
}
export const EAST = Math.PI / 2;
/** hand on a headphone cup: offset from the head bone, in the head's axes */
export const EAR = (s: number, dy = 0): number[] => [s * 0.118, 0.07 + dy, 0.035, 3];
/** Expression presets, calibrated on the avatar: 'relaxed' is the open-eyed smile, 'happy' at 1 the eyes-shut laugh (partial 'happy' reads sleepy, 'angry' draws a forehead shadow — both avoided). */
export const FACE = {
  neutral: {} as Face, focus: {} as Face, smile: { relaxed: 0.6 } as Face, grin: { relaxed: 1, ee: 0.25 } as Face,
  surprised: { surprised: 1, oh: 0.45 } as Face, puzzled: { surprised: 0.5, oh: 0.15 } as Face, mischief: { relaxed: 0.85, ee: 0.2 } as Face,
  effort: { ee: 0.45 } as Face, joy: { happy: 1 } as Face, uhoh: { surprised: 0.9, ee: 0.3 } as Face, breath: { aa: 0.35 } as Face,
};
export const faceMix = (a: Face, b: Face, t: number): Face => { const o: any = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = lerp((a as any)[k] ?? 0, (b as any)[k] ?? 0, t); return o; };
/** Solve s(t) = target for monotone s on [lo, hi]. */
export const timeAt = (s: (t: number) => number, target: number, lo: number, hi: number) => { for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (s(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };
export const rootOn = (path: Path, s: number, v: number, y: number, lean = 0.75): Root => { const p = path.at(s); return { pos: new THREE.Vector3(p.x, y, p.y), yaw: path.yaw(s), roll: Math.max(-0.42, Math.min(0.42, -Math.atan((v * v * path.curv(s)) / G) * lean)) }; };

