/** Reusable street-furniture builders (all batched). Positions are bases; ry = heading. */
import * as THREE from 'three';
import { type Ctx, M, anchor } from './kit';
import { shrub } from './stunt';

const rot = (x: number, z: number, ry: number): [number, number] => [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];

/** Slim steel railing from (x0,z0) to (x1,z1), base at y, `h` high: posts, mid rail, top rail. */
export function railing(c: Ctx, x0: number, z0: number, x1: number, z1: number, y: number, h = 0.95, color = '#4d5663', top = '#7a5a3c') {
  const { b } = c, m = M(color), len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), n = Math.max(1, Math.round(len / 1.8));
  for (let i = 0; i <= n; i++) b.box(m, 0.05, h, 0.05, x0 + ((x1 - x0) * i) / n, y, z0 + ((z1 - z0) * i) / n, ry);
  for (const k of [0.3, 0.62]) b.add(m, new THREE.BoxGeometry(len, 0.03, 0.03), (x0 + x1) / 2, y + h * k, (z0 + z1) / 2, ry);
  b.add(M(top), new THREE.BoxGeometry(len + 0.06, 0.05, 0.09), (x0 + x1) / 2, y + h, (z0 + z1) / 2, ry);
}

/** Park bench (1.7 m), seat faces local +Z. Registers a `benches` anchor. */
export function bench(c: Ctx, x: number, y: number, z: number, ry: number, wood = '#a8713f') {
  const { b } = c, w = M(wood), iron = M('#3f4650');
  for (const k of [-0.16, 0, 0.16]) { const [ox, oz] = rot(0, k, ry); b.box(w, 1.7, 0.035, 0.13, x + ox, y + 0.43, z + oz, ry); }
  for (const [h, back] of [[0.62, -0.27], [0.8, -0.3]]) { const [ox, oz] = rot(0, back, ry); b.box(w, 1.7, 0.12, 0.03, x + ox, y + h, z + oz, ry); }
  for (const s of [-0.72, 0.72]) {
    const [ox, oz] = rot(s, 0, ry), [bx, bz] = rot(s, -0.27, ry);
    b.box(iron, 0.05, 0.43, 0.46, x + ox, y, z + oz, ry); b.box(iron, 0.05, 0.5, 0.05, x + bx, y + 0.43, z + bz, ry);
    b.box(iron, 0.05, 0.04, 0.4, x + ox, y + 0.62, z + oz, ry);
  }
  anchor(c, 'benches', x, y + 0.45, z, ry);
  c.solids.push([x - 0.9, z - 0.9, x + 0.9, z + 0.9, y + 0.9]);
}

export function bin(c: Ctx, x: number, y: number, z: number, color = '#2f6f62') {
  const { b } = c; b.cyl(M(color), 0.2, 0.24, 0.72, x, y + 0.05, z, 12); b.cyl(M('#3b424b'), 0.26, 0.2, 0.08, x, y + 0.77, z, 12); b.cyl(M('#3b424b'), 0.06, 0.06, 0.05, x, y, z, 8);
}

export function bollard(c: Ctx, x: number, y: number, z: number, color = '#3b424b') {
  const { b } = c; b.cyl(M(color), 0.075, 0.075, 0.8, x, y, z, 10); b.cyl(M('#eda32c'), 0.08, 0.08, 0.07, x, y + 0.62, z, 10); b.add(M(color), new THREE.SphereGeometry(0.085, 10, 6), x, y + 0.8, z);
}

/** Street lamp: tapered post with an arm over the road side (arm points along local +Z). Registers `lamps`. */
export function lampPost(c: Ctx, x: number, y: number, z: number, ry: number, h = 6.2, color = '#39525c') {
  const { b } = c, m = M(color), [ax, az] = rot(0, 0.75, ry), [hx, hz] = rot(0, 1.45, ry);
  b.cyl(m, 0.13, 0.1, 0.9, x, y, z, 10); b.cyl(m, 0.075, 0.05, h - 0.9, x, y + 0.9, z, 8);
  b.add(m, new THREE.BoxGeometry(0.06, 0.06, 1.6), x + ax, y + h - 0.05, z + az, ry, -0.12);
  b.add(m, new THREE.BoxGeometry(0.3, 0.09, 0.62), x + hx, y + h + 0.02, z + hz, ry);
  b.add(M('#fff6d8'), new THREE.BoxGeometry(0.22, 0.03, 0.5), x + hx, y + h - 0.04, z + hz, ry);
  b.cyl(M('#eda32c'), 0.14, 0.14, 0.06, x, y + 0.9, z, 10);
  anchor(c, 'lamps', x, y, z, ry);
  c.solids.push([x - 0.15, z - 0.15, x + 0.15, z + 0.15, y + h]);
}

/** Promenade / deck lamp standard: short post with a globe pair. */
export function globeLamp(c: Ctx, x: number, y: number, z: number, h = 3.4, color = '#2f4a55') {
  const { b } = c, m = M(color);
  b.cyl(m, 0.11, 0.08, 0.5, x, y, z, 10); b.cyl(m, 0.05, 0.04, h - 0.5, x, y + 0.5, z, 8);
  b.box(m, 0.9, 0.05, 0.05, x, y + h - 0.2, z);
  for (const s of [-0.45, 0.45]) { b.add(M('#fff3cf'), new THREE.SphereGeometry(0.17, 12, 8), x + s, y + h + 0.02, z); b.cyl(m, 0.06, 0.09, 0.08, x + s, y + h - 0.2, z, 8); }
  anchor(c, 'lamps', x, y, z);
  c.solids.push([x - 0.5, z - 0.12, x + 0.5, z + 0.12, y + h]);
}

/** Rectangular planter box with shrubs. */
export function planterBox(c: Ctx, x: number, y: number, z: number, w: number, d: number, h = 0.55, seed = 1, wall = '#b7a58c', flower?: string) {
  const { b } = c;
  b.box(M(wall), w, h, d, x, y, z); b.box(M('#8e7d68'), w + 0.08, 0.06, d + 0.08, x, y + h, z);
  b.flatQuad(M('#5b4636'), x - w / 2 + 0.06, z - d / 2 + 0.06, x + w / 2 - 0.06, z + d / 2 - 0.06, y + h + 0.062, 1);
  const n = Math.max(1, Math.round(Math.max(w, d) / 0.8));
  for (let i = 0; i < n; i++) { const k = n === 1 ? 0 : i / (n - 1) - 0.5; shrub(c, x + (w > d ? k * (w - 0.7) : 0), y + h, z + (w > d ? 0 : k * (d - 0.7)), Math.min(w, d) * 0.55, seed * 17 + i, flower); }
  c.solids.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, y + h + 0.6]);
}

/** Round pot with a shrub or small topiary. */
export function pot(c: Ctx, x: number, y: number, z: number, r = 0.32, seed = 1, color = '#c9703f', flower?: string) {
  const { b } = c; b.cyl(M(color), r * 0.7, r, r * 1.5, x, y, z, 12); b.cyl(M('#5b4636'), r * 0.92, r * 0.92, 0.02, x, y + r * 1.5 - 0.03, z, 12);
  shrub(c, x, y + r * 1.4, z, r * 1.25, seed, flower);
}

/** Café set: round table, two chairs, optional umbrella. Registers `cafeSeats` (one per chair, facing the table). */
export function cafeSet(c: Ctx, x: number, y: number, z: number, ry: number, umbrella?: string, chair = '#e8e2d6') {
  const { b } = c, steel = M('#5d6470');
  b.cyl(steel, 0.2, 0.2, 0.03, x, y, z, 12); b.cyl(steel, 0.03, 0.03, 0.7, x, y + 0.03, z, 6); b.cyl(M('#f3ede0'), 0.38, 0.38, 0.035, x, y + 0.72, z, 16);
  for (const s of [-1, 1]) {
    const [cx, cz] = rot(s * 0.72, 0, ry), a = ry + (s > 0 ? -Math.PI / 2 : Math.PI / 2);
    b.box(M(chair), 0.4, 0.035, 0.4, x + cx, y + 0.44, z + cz, a);
    const [bx, bz] = rot(s * 0.92, 0, ry); b.box(M(chair), 0.4, 0.42, 0.03, x + bx, y + 0.5, z + bz, a);
    for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) b.cyl(steel, 0.015, 0.015, 0.44, x + cx + lx, y, z + cz + lz, 5);
    anchor(c, 'cafeSeats', x + cx, y + 0.46, z + cz, a);
  }
  if (umbrella) {
    b.cyl(steel, 0.025, 0.025, 2.35, x, y + 0.75, z, 6);
    const g = new THREE.ConeGeometry(1.35, 0.5, 8, 1, true); b.add(M(umbrella, null, 'umb', THREE.DoubleSide), g, x, y + 2.75, z, 0.39);
    b.add(M('#f3ede0'), new THREE.CylinderGeometry(1.36, 1.36, 0.1, 8, 1, true), x, y + 2.47, z, 0.39);
  }
  c.solids.push([x - 1.1, z - 1.1, x + 1.1, z + 1.1, y + 0.8]);
}
