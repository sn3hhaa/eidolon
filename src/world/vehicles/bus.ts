/** The hero city bus: 11 m × 2.55 m × 3.05 m, flat walkable roof at y = 3.05, doors on the right (−X). */
import * as THREE from 'three';
import { toon } from '../../engine/look';
import { Bag, M, makeWheel } from './parts';
import { busDetails } from './busdetail';
import type { Vehicle } from './types';

export const BUS = { len: 11, wid: 2.55, roofY: 3.05, wr: 0.48, axF: 2.85, axR: -2.75, clear: 0.34, winY0: 1.27, winY1: 2.32 };
const N = 13, HW = BUS.wid / 2;
// material slots
const DARK = 0, CREAM = 1, TEAL = 2, ORANGE = 3, GLASS = 4, ROOF = 5;
const BAND = [DARK, DARK, DARK, CREAM, TEAL, ORANGE, CREAM, GLASS, CREAM, ROOF, ROOF, ROOF];   // segment j → j+1
export const DOORS: [number, number][] = [[3.55, 4.75], [-0.75, 0.75]];                        // z ranges on the right side
const PILLARS = [-4.95, -3.55, -2.15, -0.75, 0.75, 2.15, 3.55, 4.75];

function busRing(z: number): [number, number][] {
  const half = BUS.len / 2, E = 0.4, d = Math.max(0, (Math.abs(z) - (half - E)) / E), w = HW - 0.2 * Math.pow(d, 2.6);
  let sill = BUS.clear; const Ra = BUS.wr + 0.09;
  for (const zc of [BUS.axF, BUS.axR]) { const dz = z - zc; if (Math.abs(dz) < Ra) sill = Math.max(sill, BUS.wr + Math.sqrt(Ra * Ra - dz * dz)); }
  const s = Math.min(sill, 0.92), top = BUS.roofY;
  return [[0, BUS.clear + 0.04], [w - 0.42, s], [w - 0.07, s], [w, Math.min(s + 0.05, 0.94)], [w, 0.96], [w, 1.13], [w, 1.18], [w, BUS.winY0], [w - 0.012, BUS.winY1], [w - 0.02, 2.66], [w - 0.1, top - 0.1], [w - 0.3, top - 0.015], [0, top]];
}

function busShell(mats: THREE.Material[]) {
  const step = 0.05, n = Math.round(BUS.len / step), pos: number[] = [], uv: number[] = [], idx: number[][] = mats.map(() => []);
  const zs: number[] = []; for (let i = 0; i <= n; i++) zs.push(-BUS.len / 2 + i * step);
  for (const z of zs) { const r = busRing(z); for (const side of [1, -1]) for (const [x, y] of r) { pos.push(x * side, y, z); uv.push(z * 0.45, (y - BUS.winY0) / (BUS.winY1 - BUS.winY0)); } }
  const V = (i: number, side: number, j: number) => i * N * 2 + side * N + j;
  const inAny = (z: number, list: [number, number][], m = 0) => list.some(([a, b]) => z > a + m && z < b - m);
  for (let i = 0; i < n; i++) for (let j = 0; j < N - 1; j++) for (const side of [0, 1]) {
    const z = (zs[i] + zs[i + 1]) / 2; let m = BAND[j];
    const pillar = PILLARS.some((p) => Math.abs(z - p) < 0.05) || z < -5.0 || z > 4.8;
    if (m === GLASS && pillar) m = DARK;
    if (side === 1 && j >= 3 && j <= 7 && inAny(z, DOORS)) {                           // door leaves: glazed, dark frame, centre split
      const [a, b] = DOORS.find(([a, b]) => z > a && z < b)!, mid = (a + b) / 2;
      m = z - a < 0.07 || b - z < 0.07 || Math.abs(z - mid) < 0.035 ? DARK : j === 3 ? DARK : GLASS;
    }
    const q = [V(i, side, j), V(i, side, j + 1), V(i + 1, side, j + 1), V(i + 1, side, j)]; if (side) q.reverse();
    idx[m].push(q[0], q[1], q[2], q[0], q[2], q[3]);
  }
  for (const [i, flip] of [[0, true], [n, false]] as [number, boolean][]) {               // flat end caps
    const r = busRing(zs[i]), base = pos.length / 3; pos.push(0, 1.6, zs[i]); uv.push(0, 0);
    for (const side of [1, -1]) for (const [x, y] of r) { pos.push(x * side, y, zs[i]); uv.push(0, 0); }
    for (const side of [0, 1]) for (let j = 0; j < N - 1; j++) { const a = base + 1 + side * N + j, b = a + 1, m = CREAM; if ((side === 1) === flip) idx[m].push(base, a, b); else idx[m].push(base, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  let o = 0; const all: number[] = []; idx.forEach((list, m) => { g.addGroup(o, list.length, m); o += list.length; for (const v of list) all.push(v); });
  g.setIndex(all); g.computeVertexNormals();
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i <= n; i++) for (const side of [0, 1]) for (const j of [0, N - 1]) { const v = V(i, side, j), y = nrm.getY(v), z = nrm.getZ(v), l = Math.hypot(y, z) || 1; nrm.setXYZ(v, 0, y / l, z / l); }
  const m = new THREE.Mesh(g, mats); m.castShadow = true; m.receiveShadow = true; return m;
}

let busGlass: THREE.Material | null = null;
export function makeBus(): Vehicle & { roofY: number } {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  if (!busGlass) { busGlass = M.glass().clone(); busGlass.name = 'busGlass'; busGlass.opacity = 0.6; }
  const cream = toon('#f3e8cf'), teal = toon('#1e8c8a'), orange = toon('#ef7b2b'), roof = toon('#faf4e6');
  body.add(busShell([M.dark(), cream, teal, orange, busGlass, roof]));
  const tail = toon('#b0222c', { emissive: '#ff2222', emissiveIntensity: 0.12 }), amb = { l: toon('#e58a1c', { emissive: '#ffae2a', emissiveIntensity: 0.05 }), r: toon('#e58a1c', { emissive: '#ffae2a', emissiveIntensity: 0.05 }) };
  const bag = new Bag();
  busDetails(bag, { cream, teal, orange, roof, glass: busGlass, tail, amb });
  bag.build(body);
  // cabin liner so the glazing shows a lit interior instead of the far street
  const liner = new THREE.Mesh(new THREE.BoxGeometry(BUS.wid - 0.1, 2.0, BUS.len - 0.3), toon('#d9d0c2', { side: THREE.BackSide })); liner.position.y = 1.92; body.add(liner);
  const wheels: THREE.Object3D[] = [], steer: THREE.Object3D[] = [];
  for (const z of [BUS.axF, BUS.axR]) for (const s of [1, -1]) {
    const w = makeWheel(BUS.wr, 0.3, 2), x = s * (HW - 0.2);
    if (z > 0) { const p = new THREE.Group(); p.position.set(x, BUS.wr, z); p.add(w); group.add(p); steer.push(p); } else { w.position.set(x, BUS.wr, z); group.add(w); }
    wheels.push(w);
  }
  return {
    group, body, wheels, steer, length: BUS.len, width: BUS.wid, height: BUS.roofY, wheelRadius: BUS.wr, wheelbase: BUS.axF - BUS.axR, roofY: BUS.roofY,
    lights: {
      brake: (on) => { tail.emissiveIntensity = on ? 1.4 : 0.12; },
      indicate: (side, on) => { amb.l.emissiveIntensity = side === 'l' && on ? 1.6 : 0.05; amb.r.emissiveIntensity = side === 'r' && on ? 1.6 : 0.05; },
    },
  };
}
