/**
 * Car-body loft: a smooth shell swept through cross-section stations along +Z (forward).
 * Each station is a half ring (x ≥ 0) from the floor centre, round the sill, up the body side
 * to the shoulder, then over the greenhouse (or hood/deck when top == belt) to the roof centre.
 * Material groups: 0 = paint, 1 = glass.
 */
import * as THREE from 'three';

export interface Station {
  z: number; w: number;          // half width at the widest point
  bot: number; arch: number;     // floor height; sill height at the side (raised over the wheels)
  belt: number; top: number;     // shoulder height; roof/hood height
  wr: number;                    // roof half width (tumblehome)
  glassSide?: boolean; glassTop?: boolean; crown?: number;
}
export const RING = 13;
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export function ring(s: Station): [number, number][] {
  const { w, bot, belt, top } = s, sill = Math.max(bot, s.arch), h = Math.max(0, top - belt), k = sm(0, 0.14, h), crown = s.crown ?? 0.03;
  const y3 = Math.min(sill + 0.1, belt - 0.14), y4 = Math.max(belt - 0.1, y3 + 0.02);
  const hx = [w - 0.07, w * 0.74, w * 0.52, w * 0.28, 0], hy = hx.map((x) => belt + crown * (1 - (x / w) * (x / w)));
  const gx = [w - 0.078, s.wr + 0.03, s.wr - 0.025, s.wr * 0.55, 0], gy = [belt + 0.025, top - 0.07, top - 0.015, top + 0.012, top + 0.016];
  const p: [number, number][] = [[0, bot], [Math.max(0.05, w - 0.3), sill], [w - 0.1, sill], [w - 0.03, sill + 0.035], [w, y3], [w, y4], [w - 0.018, belt - 0.03], [w - 0.055, belt]];
  for (let i = 0; i < 5; i++) p.push([mix(hx[i], gx[i], k), mix(hy[i], gy[i], k)]);
  return p;
}

export function loftBody(st: Station[]): THREE.BufferGeometry {
  const n = st.length, pos: number[] = [], uv: number[] = [], paint: number[] = [], glass: number[] = [];
  const z0 = st[0].z, z1 = st[n - 1].z;
  for (const s of st) {
    const r = ring(s);
    for (const side of [1, -1]) for (const [x, y] of r) { pos.push(x * side, y, s.z); uv.push((s.z - z0) / (z1 - z0), (y - s.belt) / Math.max(0.05, s.top - s.belt)); }
  }
  const V = (i: number, side: number, j: number) => i * RING * 2 + side * RING + j;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < RING - 1; j++) {
    const a = st[i], b = st[i + 1];
    const g = (j === 8 && a.glassSide && b.glassSide) || (j >= 9 && a.glassTop && b.glassTop);
    const out = g ? glass : paint;
    for (const side of [0, 1]) {
      const q = [V(i, side, j), V(i, side, j + 1), V(i + 1, side, j + 1), V(i + 1, side, j)];
      if (side) q.reverse();
      out.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    }
  }
  // flat end caps with their own vertices (hard edge)
  for (const [i, flip] of [[0, true], [n - 1, false]] as [number, boolean][]) {
    const r = ring(st[i]), base = pos.length / 3, cy = (st[i].bot + st[i].top) / 2;
    pos.push(0, cy, st[i].z); uv.push(0, 0);
    for (const side of [1, -1]) for (const [x, y] of r) { pos.push(x * side, y, st[i].z); uv.push(0, 0); }
    for (const side of [0, 1]) for (let j = 0; j < RING - 1; j++) {
      const a = base + 1 + side * RING + j, b = a + 1;
      if ((side === 1) === flip) paint.push(base, a, b); else paint.push(base, b, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([...paint, ...glass]);
  g.addGroup(0, paint.length, 0); g.addGroup(paint.length, glass.length, 1);
  g.computeVertexNormals();
  const nrm = g.attributes.normal as THREE.BufferAttribute;      // weld the centreline so hood and roof have no crease
  for (let i = 0; i < n; i++) for (const side of [0, 1]) for (const j of [0, RING - 1]) {
    const v = V(i, side, j), y = nrm.getY(v), z = nrm.getZ(v), l = Math.hypot(y, z) || 1; nrm.setXYZ(v, 0, y / l, z / l);
  }
  return g;
}

/** Thin ribbon hugging the body side at one station (door shut-lines, trim). */
export function seam(s: Station, j0: number, j1: number, width = 0.012, lift = 0.004): THREE.BufferGeometry {
  const r = ring(s), pos: number[] = [], idx: number[] = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let j = j0; j <= j1; j++) { const [x, y] = r[j]; pos.push((x + lift) * side, y, s.z - width / 2, (x + lift) * side, y, s.z + width / 2); }
    for (let k = 0; k < j1 - j0; k++) { const a = base + k * 2, q = side > 0 ? [a, a + 2, a + 3, a + 1] : [a, a + 1, a + 3, a + 2]; idx.push(q[0], q[1], q[2], q[0], q[2], q[3]); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
