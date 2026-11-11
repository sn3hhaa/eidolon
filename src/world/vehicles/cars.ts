/** Car builder: spec → lofted body + trim, wheels, lights. */
import * as THREE from 'three';
import { toon } from '../../engine/look';
import { loftBody, seam, ring, type Station } from './loft';
import { Bag, M, makeWheel, plateGeo, plateMat } from './parts';
import type { Vehicle } from './types';

export interface Spec {
  len: number; wid: number; hgt: number; wb: number; wr: number; clear: number;
  belt: [number, number][];                 // shoulder/hood/deck height keypoints [z, y], rear → front
  gh: [number, number, number, number];     // z of: rear-window base, roof start, roof end, windscreen base
  tumble: number; pillars: number[]; doors: number[];
  nose: number; tail: number;               // plan-view taper of the ends (0 = square)
  axle?: number; tire?: number; hub?: number; bumper?: 'chrome' | 'dark' | 'paint'; crown?: number;
}
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerpKeys = (keys: [number, number][], z: number) => {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (z <= keys[i][0]) { const [z0, y0] = keys[i - 1], [z1, y1] = keys[i]; const t = (z - z0) / (z1 - z0); return y0 + (y1 - y0) * (t * 0.6 + sm(0, 1, t) * 0.4); }
  return keys[keys.length - 1][1];
};

export function stations(sp: Spec): Station[] {
  const out: Station[] = [], half = sp.len / 2, step = 0.035, n = Math.round(sp.len / step), E = 0.42;
  const ax = sp.axle ?? 0, Ra = sp.wr + 0.065, roofMid = (sp.gh[1] + sp.gh[2]) / 2, roofHalf = Math.max(0.2, (sp.gh[2] - sp.gh[1]) / 2);
  for (let i = 0; i <= n; i++) {
    const z = -half + (sp.len * i) / n;
    const dF = Math.max(0, (z - (half - E)) / E), dR = Math.max(0, (-z - (half - E)) / E), d = Math.max(dF, dR);
    const w = (sp.wid / 2) * (1 - (dF > 0 ? sp.nose : sp.tail) * Math.pow(d, 2.4));
    let belt = lerpKeys(sp.belt, z) - 0.07 * Math.pow(d, 3);
    const roofY = sp.hgt - 0.035 * Math.pow((z - roofMid) / roofHalf, 2);
    let g = 0;                                                             // 0 = no cabin here, 1 = full roof height
    if (z > sp.gh[0] && z < sp.gh[1]) g = (z - sp.gh[0]) / (sp.gh[1] - sp.gh[0]);
    else if (z >= sp.gh[1] && z <= sp.gh[2]) g = 1;
    else if (z > sp.gh[2] && z < sp.gh[3]) g = 1 - (z - sp.gh[2]) / (sp.gh[3] - sp.gh[2]);
    g = g * 0.55 + sm(0, 1, g) * 0.45;
    const top = belt + Math.max(0, roofY - belt) * g;
    let arch = 0;
    for (const zc of [ax + sp.wb / 2, ax - sp.wb / 2]) { const dz = z - zc; if (Math.abs(dz) < Ra) arch = Math.max(arch, sp.wr + Math.sqrt(Ra * Ra - dz * dz)); }
    const pillar = sp.pillars.some((p) => Math.abs(z - p) < 0.05);
    const inWs = z > sp.gh[2] + 0.06 && z < sp.gh[3] - 0.05, inRw = z > sp.gh[0] + 0.05 && z < sp.gh[1] - 0.06;
    out.push({
      z, w, bot: sp.clear + 0.1 * d * d, arch, belt, top, wr: Math.min(sp.wid / 2 - 0.08 - sp.tumble, w - 0.12),
      glassSide: g > 0.5 && !pillar && z > sp.gh[0] + 0.12 && z < sp.gh[3] - 0.12, glassTop: inWs || inRw, crown: sp.crown,
    });
  }
  return out;
}

export interface CarParts { v: Vehicle; bag: Bag; st: Station[]; at: (z: number) => Station; paint: THREE.Material; sp: Spec }

export function buildCar(sp: Spec, color: string, seed: number, driver: boolean): CarParts {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const st = stations(sp), at = (z: number) => st.reduce((a, b) => (Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a));
  const paint = toon(color), half = sp.len / 2, W = sp.wid;
  const shell = new THREE.Mesh(loftBody(st), [paint, M.glass()]); shell.castShadow = true; shell.receiveShadow = true; body.add(shell);
  const bag = new Bag();
  const tail = toon('#b0222c', { emissive: '#ff2222', emissiveIntensity: 0.12 }), amb = { l: toon('#e58a1c', { emissive: '#ffae2a', emissiveIntensity: 0.05 }), r: toon('#e58a1c', { emissive: '#ffae2a', emissiveIntensity: 0.05 }) };
  const front = at(half - 0.02), rear = at(-half + 0.02), fb = front.belt, rb = rear.belt;
  const bm = sp.bumper === 'dark' ? M.dark() : sp.bumper === 'paint' ? paint : M.chrome();
  // bumpers, grille, lamps
  bag.box(bm, W * 0.99, 0.15, 0.2, 0, sp.clear + 0.17, half - 0.05, 0.05).box(bm, W * 0.99, 0.15, 0.2, 0, sp.clear + 0.17, -half + 0.05, 0.05);
  bag.box(M.dark(), W * 0.46, Math.min(0.16, fb - sp.clear - 0.36), 0.05, 0, fb - 0.2, half - 0.005, 0.015);
  for (let i = -2; i <= 2; i++) bag.box(M.chrome(), 0.012, 0.12, 0.02, i * W * 0.085, fb - 0.2, half + 0.018, 0.004);
  bag.pair(M.lamp(), 0.27, 0.13, 0.05, W * 0.345, fb - 0.2, half - 0.004, 0.03);
  bag.pair(M.chrome(), 0.3, 0.16, 0.03, W * 0.345, fb - 0.2, half - 0.02, 0.03);
  bag.box(amb.l, 0.09, 0.07, 0.06, W * 0.455, fb - 0.33, half - 0.03, 0.02).box(amb.r, 0.09, 0.07, 0.06, -W * 0.455, fb - 0.33, half - 0.03, 0.02);
  bag.pair(tail, 0.3, 0.12, 0.05, W * 0.33, rb - 0.17, -half + 0.002, 0.025);
  bag.box(amb.l, 0.1, 0.12, 0.05, W * 0.455, rb - 0.17, -half + 0.012, 0.02).box(amb.r, 0.1, 0.12, 0.05, -W * 0.455, rb - 0.17, -half + 0.012, 0.02);
  bag.add(plateMat(seed), plateGeo(), 0, sp.clear + 0.3, half + 0.052).add(plateMat(seed), plateGeo(), 0, rb - 0.36, -half - 0.03, 0, Math.PI, 0);
  // shut-lines, handles, sill trim, mirrors
  for (const z of sp.doors) { const s = at(z); bag.add(M.dark(), seam(s, 3, 7)); }
  for (let i = 0; i + 1 < sp.doors.length; i++) { const z = sp.doors[i] + 0.13, s = at(z); bag.pair(M.chrome(), 0.02, 0.025, 0.12, s.w + 0.004, s.belt - 0.13, z, 0.008); }
  const mz = sp.gh[3] - 0.22, ms = at(mz); bag.pair(paint, 0.12, 0.1, 0.07, ms.w + 0.05, ms.belt + 0.06, mz, 0.03);
  // cabin: floor tub, seats, wheel, optional driver
  const c0 = sp.gh[0] + 0.25, c1 = sp.gh[3] - 0.3, cm = (c0 + c1) / 2, cb = lerpKeys(sp.belt, cm);
  bag.box(M.interior(), W - 0.3, 0.3, c1 - c0, 0, cb - 0.18, cm, 0.04);
  const fz = sp.gh[2] - 0.45;
  for (const x of [0.36, -0.36]) bag.box(M.seat(), 0.46, 0.5, 0.14, x, cb + 0.12, fz - 0.22, 0.06, -0.18);
  if (sp.gh[1] - sp.gh[0] < 1.2 && fz - c0 > 1.1) bag.box(M.seat(), W - 0.5, 0.42, 0.14, 0, cb + 0.1, fz - 1.02, 0.06, -0.2);
  bag.add(M.dark(), new THREE.TorusGeometry(0.17, 0.018, 6, 20), 0.36, cb + 0.17, fz + 0.28, -0.45);
  if (driver) { bag.add(M.skin(), new THREE.SphereGeometry(0.1, 14, 10), 0.36, Math.min(cb + 0.3, sp.hgt - 0.17), fz - 0.16).box(M.skin(), 0.4, 0.3, 0.2, 0.36, cb + 0.04, fz - 0.18, 0.08, -0.12); }
  // wheels
  const ax = sp.axle ?? 0, tw = sp.tire ?? 0.2, wheels: THREE.Object3D[] = [], steer: THREE.Object3D[] = [];
  for (const z of [ax + sp.wb / 2, ax - sp.wb / 2]) for (const s of [1, -1]) {
    const w = makeWheel(sp.wr, tw, sp.hub ?? 0), x = s * (W / 2 - tw / 2 - 0.035);
    if (z > ax) { const p = new THREE.Group(); p.position.set(x, sp.wr, z); p.add(w); group.add(p); steer.push(p); } else { w.position.set(x, sp.wr, z); group.add(w); }
    wheels.push(w);
  }
  const v: Vehicle = {
    group, body, wheels, steer, length: sp.len, width: W, height: sp.hgt, wheelRadius: sp.wr, wheelbase: sp.wb,
    lights: {
      brake: (on) => { tail.emissiveIntensity = on ? 1.4 : 0.12; },
      indicate: (side, on) => { amb.l.emissiveIntensity = side === 'l' && on ? 1.6 : 0.05; amb.r.emissiveIntensity = side === 'r' && on ? 1.6 : 0.05; },
    },
  };
  return { v, bag, st, at, paint, sp };
}
export { ring };
