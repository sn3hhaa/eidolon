/**
 * FAST FORWARD — the production: one stage, one continuous performance, a list of shots with hard cuts.
 * Three clocks:  t  film time (0‥90 s)  →  σ  story time (the girl's own, via each shot's mapping; slow motion lives here)
 *                →  tw world time (stops at TFZ when σ reaches A.freeze, creeps back and resumes around the stair jump).
 */
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import type { Production, Shot } from '../engine/film';
import { buildStage, type Stage } from './stage';
import { perform, A, E, F, type Perf } from './perform';
import { TFZ } from './traffic';
import { integrate, track, sstep, hash } from './util';

export interface Ctx { t: number; u: number; s: number; pf: Perf; H: THREE.Vector3; head: THREE.Vector3; chest: THREE.Vector3; S: Stage; at(pos: THREE.Vector3 | number[], target: THREE.Vector3 | number[], fov?: number, roll?: number): void }
export interface ShotDef extends Shot {
  sig: (t: number) => number; cam: (c: Ctx) => void;
  /** overrides for cutaways */ tw?: (t: number) => number; tremble?: (t: number) => number; freeze?: (t: number) => number; signals?: (t: number) => ['g' | 'y' | 'r' | 'off', 'g' | 'y' | 'r' | 'off'];
  /** shadow-map radius (m) around the camera target */ shadow?: number; /** hand-held energy */ shake?: number;
}
/** Shot builder: `keys` are [film time, story time] pairs (linear between; the first/last film times bound the shot). */
export const shot = (name: string, keys: [number, number][], cam: (c: Ctx) => void, extra: Partial<ShotDef> = {}): ShotDef => ({ name, t0: keys[0][0], t1: keys[keys.length - 1][0], sig: track(keys, 'l'), cam, ...extra });
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// world time as a function of story time
const resume = integrate([[A.freeze, 0], [E.notice + 0.8, 0], [E.notice + 1.6, 0.03], [E.run, 0.12], [F.take - 0.6, 0.3], [F.take, 0.4], [F.apex, 0.75], [F.apex + 0.25, 1], [400, 1]]);
export const twOf = (s: number) => TFZ + s - A.freeze;   // the world runs with her the whole time
void resume;
export const trembleOf = (s: number) => sstep(E.start + 0.3, E.notice + 1.2, s) * (1 - sstep(E.run + 1.5, F.take, s));
export const freezeOf = (s: number) => sstep(A.freeze + 1.0, A.freeze + 1.4, s) * (1 - sstep(E.run, F.apex + 0.3, s));
export const pulseOf = (s: number) => (s > A.freeze && s < A.freeze + 1.45 ? 1.5 + 300 * Math.pow((s - A.freeze) / 1.45, 2.2) : -1);
const reactOf = (s: number) => sstep(F.apex, F.land + 0.3, s) * (1 - sstep(F.land + 3, F.land + 6, s));

import { shotsA } from './shots1';
import { shotsB } from './shots2';

export async function build(q: URLSearchParams): Promise<Production & { debug?: string }> {
  const S = await buildStage(), look = defaultLook(), shots: ShotDef[] = [...shotsA(S), ...shotsB(S)];
  for (let i = 1; i < shots.length; i++) if (Math.abs(shots[i].t0 - shots[i - 1].t1) > 1e-6) throw new Error(`shot gap at ${shots[i].name}: ${shots[i - 1].t1} → ${shots[i].t0}`);
  const pulseO = new THREE.Vector3().copy(perform(A.freeze).root.pos).add(V(0, 1.0, 0));
  const tgt = new THREE.Vector3(), cam = S.camera, _d = new THREE.Vector3();
  const only = q.get('only');
  return {
    scene: S.scene, camera: cam, look, shots,
    debug: `shots ${shots.length} · ${shots.map((s) => `${s.name}@${s.t0}`).join(' ')}`,
    update(t: number, sh: Shot) {
      const d = sh as ShotDef, s = d.sig(t), pf = S.hero.apply(s);
      const tw = twOf(s), tr = 0;
      S.traffic.set(tw, tr, t); S.nature.set(tw, s, tr, t, S.hero.head()); S.crowd.set(tw, S.hero.head(), reactOf(s));
      S.ground.setTime(tw); S.buildings.setTime(tw);
      const ph = (((tw % 24) + 24) % 24), sg = ph < 10 ? (['g', 'r'] as const) : ph < 12 ? (['y', 'r'] as const) : ph < 22 ? (['r', 'g'] as const) : (['r', 'y'] as const); void hash; S.ground.setSignals(sg[0], sg[1]);
      look.freeze = 0; look.pulseR = -1; void pulseO; void freezeOf; void pulseOf; void trembleOf;
      look.fade = sstep(0, 0.5, t);
      look.flash = 0;
      const ctx: Ctx = {
        t, u: (t - d.t0) / (d.t1 - d.t0), s, pf, H: pf.root.pos, head: S.hero.head(), chest: S.hero.chest(), S,
        at(pos, target, fov = 40, roll = 0) {
          cam.position.copy(Array.isArray(pos) ? V(pos[0], pos[1], pos[2]) : pos); tgt.copy(Array.isArray(target) ? V(target[0], target[1], target[2]) : target);
          const k = d.shake ?? 0.004; tgt.x += k * Math.sin(t * 5.1) * Math.sin(t * 2.3) * cam.position.distanceTo(tgt); tgt.y += k * Math.sin(t * 6.7 + 1) * Math.sin(t * 1.9) * cam.position.distanceTo(tgt);
          cam.up.set(0, 1, 0); cam.lookAt(tgt); if (roll) cam.rotateZ(roll); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
        },
      };
      d.cam(ctx);
      const dist = cam.position.distanceTo(tgt), r = d.shadow ?? THREE.MathUtils.clamp(dist * 1.5, 9, 48);
      S.sun.focus(_d.copy(tgt).lerp(cam.position, 0.25), r);
      if (only) void 0;
    },
    overlay(t: number, g: CanvasRenderingContext2D) {
      const YEL = '#f6d21c', heavy = (px: number) => `900 ${px}px Impact, "Arial Black", "Bahnschrift", sans-serif`;
      const put = (txt: string, x: number, y: number, px: number, col = YEL) => { g.font = heavy(px); g.fillStyle = 'rgba(10,12,30,0.55)'; g.fillText(txt, x + px * 0.035, y + px * 0.035); g.fillStyle = col; g.fillText(txt, x, y); };
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      if (t >= 0.7 && t < 3.6) { put('FABLE 5.2', 86, 330, 270); return 1; }
      return 0;
    },
  };
}
