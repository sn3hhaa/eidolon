/** Smaller street life: bus shelter, benches, bins, hydrants, boxes, bikes, cafés, stalls, signs. */
import * as THREE from 'three';
import { toon, rng } from '../../engine/look';
import { CURB, L } from '../layout';
import { type Ctx, M, anchor } from './kit';
import { bench, bin, bollard, cafeSet, pot } from './props';
import { painted } from './textures';

/** Parked bicycle leaning in a rack; heading ry (front wheel toward local +Z). */
function bike(c: Ctx, x: number, y: number, z: number, ry: number, color: string) {
  const { b } = c, fr = M(color), tyre = M('#2c2f36'), cs = Math.cos(ry), sn = Math.sin(ry), P = (lz: number): [number, number] => [x + lz * sn, z + lz * cs];
  for (const lz of [-0.52, 0.52]) { const [px, pz] = P(lz); b.add(tyre, new THREE.TorusGeometry(0.33, 0.022, 6, 20), px, y + 0.35, pz, ry + Math.PI / 2); }
  const tube = (z0: number, y0: number, z1: number, y1: number, m = fr, t = 0.03) => { const [ax, az] = P(z0), [bx, bz] = P(z1), len = Math.hypot(z1 - z0, y1 - y0); b.add(m, new THREE.BoxGeometry(t, t, len), (ax + bx) / 2, y + (y0 + y1) / 2, (az + bz) / 2, ry, -Math.atan2(y1 - y0, z1 - z0)); };
  tube(-0.52, 0.35, -0.12, 0.78); tube(-0.12, 0.78, 0.36, 0.82); tube(-0.1, 0.34, 0.36, 0.82); tube(-0.52, 0.35, -0.1, 0.34); tube(-0.12, 0.78, -0.1, 0.34); tube(0.36, 0.86, 0.52, 0.35);
  tube(-0.16, 0.78, -0.2, 0.93, tyre); { const [px, pz] = P(-0.22); b.box(tyre, 0.1, 0.04, 0.24, px, y + 0.93, pz, ry); }
  { const [px, pz] = P(0.34); b.box(tyre, 0.5, 0.03, 0.03, px, y + 0.98, pz, ry); tube(0.36, 0.84, 0.34, 0.98, tyre); }
}
function bikeRack(c: Ctx, x: number, y: number, z: number, alongX: boolean, n: number, seed: number) {
  const { b } = c, R = rng(seed), steel = M('#8f979e'), cols = ['#c8502f', '#2a6f8f', '#f0a81e', '#3f8a5a', '#f4efe2', '#7a4f9a'];
  for (let i = 0; i < n; i++) {
    const px = alongX ? x + (i - (n - 1) / 2) * 0.75 : x, pz = alongX ? z : z + (i - (n - 1) / 2) * 0.75;
    b.add(steel, new THREE.TorusGeometry(0.36, 0.022, 6, 14, Math.PI), px, y + 0.42, pz, alongX ? Math.PI / 2 : 0);
    for (const s of [-0.36, 0.36]) b.cyl(steel, 0.022, 0.022, 0.42, px + (alongX ? 0 : s), y, pz + (alongX ? s : 0), 6);
    if (R() < 0.7) bike(c, px + (alongX ? 0.13 : 0), y, pz + (alongX ? 0 : 0.13), (alongX ? 0 : Math.PI / 2) + R.range(-0.08, 0.08), R.pick(cols));
  }
  c.solids.push(alongX ? [x - n * 0.4, z - 1, x + n * 0.4, z + 1, 1] : [x - 1, z - n * 0.4, x + 1, z + n * 0.4, 1]);
}
/** Stepped market stall of crates full of produce or flowers against a frontage; open side faces local +Z. */
function stall(c: Ctx, x: number, y: number, z: number, ry: number, kind: 'fruit' | 'flower', seed: number) {
  const { b } = c, R = rng(seed), crate = M('#b98a5a'), cs = Math.cos(ry), sn = Math.sin(ry);
  const cols = kind === 'fruit' ? ['#f08a1e', '#e2452b', '#f4d24a', '#7fbf4a', '#b23a5e', '#e9b872'] : ['#f08aa8', '#ffffff', '#f4d24a', '#d6427a', '#9a6fd0', '#ff7a4a'];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
    const lx = (i - 1.5) * 0.62, lz = 0.2 + row * 0.42, h = 0.75 - row * 0.2, px = x + lx * cs + lz * sn, pz = z - lx * sn + lz * cs, col = M(R.pick(cols));
    b.box(crate, 0.56, 0.2, 0.36, px, y + h, pz, ry); b.box(M('#8a6646'), 0.5, h, 0.3, px, y, pz, ry);
    for (let k = 0; k < 5; k++) b.add(col, new THREE.IcosahedronGeometry(kind === 'fruit' ? 0.075 : 0.09, 0), px + R.range(-0.2, 0.2), y + h + 0.2 + (kind === 'flower' ? R.range(0.02, 0.16) : 0.02), pz + R.range(-0.11, 0.11));
    if (kind === 'flower') b.add(M('#4f9a4e'), new THREE.IcosahedronGeometry(0.2, 0), px, y + h + 0.14, pz, 0, 0, 0, 1.2, 0.6, 0.8);
  }
  anchor(c, 'stalls', x + 1.9 * sn, y, z + 1.9 * cs, ry + Math.PI);
  c.solids.push([x - 1.4, z - 1.4, x + 1.4, z + 1.4, 1]);
}
function aFrame(c: Ctx, x: number, y: number, z: number, ry: number, col: string) {
  const { b } = c; for (const s of [-1, 1]) b.add(M(col), new THREE.BoxGeometry(0.55, 0.9, 0.03), x + Math.sin(ry) * s * 0.14, y + 0.44, z + Math.cos(ry) * s * 0.14, ry, s * 0.3); b.add(M('#f4efe2'), new THREE.BoxGeometry(0.4, 0.5, 0.012), x + Math.sin(ry) * 0.17, y + 0.5, z + Math.cos(ry) * 0.17, ry, 0.3);
}
/** Round or square sign on a post, face toward (fx,fz). */
function sign(c: Ctx, x: number, y: number, z: number, fx: number, fz: number, kind: 'stop' | 'park' | 'bus' | 'oneway') {
  const { b } = c, ry = Math.atan2(fx, fz), col = { stop: '#d5412c', park: '#2a5fae', bus: '#2a8f86', oneway: '#27344a' }[kind];
  b.cyl(M('#8f979e'), 0.03, 0.03, 2.7, x, y, z, 6);
  const g = kind === 'stop' ? new THREE.CylinderGeometry(0.32, 0.32, 0.03, 8) : kind === 'oneway' ? new THREE.BoxGeometry(0.75, 0.03, 0.26) : new THREE.CylinderGeometry(0.3, 0.3, 0.03, 20);
  b.add(M(col), g, x + fx * 0.04, y + 2.45, z + fz * 0.04, ry, Math.PI / 2);
  b.add(M('#f4efe2'), kind === 'oneway' ? new THREE.BoxGeometry(0.5, 0.032, 0.08) : new THREE.CylinderGeometry(0.19, 0.19, 0.032, kind === 'stop' ? 8 : 16), x + fx * 0.045, y + 2.45, z + fz * 0.045, ry, Math.PI / 2);
  if (kind !== 'oneway') b.add(M(col), new THREE.BoxGeometry(0.22, 0.034, 0.07), x + fx * 0.05, y + 2.45, z + fz * 0.05, ry, Math.PI / 2);
}

export function buildFurniture2(c: Ctx) {
  const { b } = c, Y = CURB;
  // ---- bus shelter on Main St south sidewalk (between the lamp at x=-54 and the tree pit at x=-48) ----
  const sx = -51.2, sz = 6.55, glass = toon('#9fd3e6', { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), fr = M('#2f5560');
  b.flat(glass);
  b.box(fr, 3.8, 0.1, 1.6, sx, Y + 2.45, sz); b.box(M('#e2572b'), 3.8, 0.16, 0.06, sx, Y + 2.38, sz - 0.8);
  for (const dx of [-1.8, 0, 1.8]) b.box(fr, 0.07, 2.45, 0.07, sx + dx, Y, sz + 0.7);
  for (const dx of [-1.8, 1.8]) b.box(fr, 0.07, 2.45, 0.07, sx + dx, Y, sz - 0.7);
  b.add(glass, new THREE.PlaneGeometry(3.6, 1.9), sx, Y + 1.3, sz + 0.7); b.add(glass, new THREE.PlaneGeometry(1.4, 1.9), sx + 1.8, Y + 1.3, sz, Math.PI / 2);
  b.box(M('#a8713f'), 2.6, 0.06, 0.4, sx - 0.3, Y + 0.48, sz + 0.42); for (const dx of [-1.4, 0.8]) b.box(fr, 0.06, 0.48, 0.36, sx + dx, Y, sz + 0.42);
  const map = painted('busmap', 128, 192, (g, w, h, R) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a8f86'; g.fillRect(0, 0, w, 30); g.strokeStyle = '#e2572b'; g.lineWidth = 5; g.beginPath(); g.moveTo(14, 60); for (let i = 1; i < 7; i++) g.lineTo(14 + i * 16, 60 + R.range(-14, 30) + i * 12); g.stroke(); g.fillStyle = '#27344a'; for (let i = 0; i < 6; i++) g.fillRect(12, 150 + i * 6, R.range(40, 100), 2); });
  b.add(M('#ffffff', map, 'busmap'), new THREE.PlaneGeometry(0.8, 1.2), sx - 1.75, Y + 1.35, sz + 0.1, Math.PI / 2); b.box(fr, 0.05, 1.3, 0.9, sx - 1.8, Y + 0.7, sz + 0.1);
  sign(c, sx + 2.6, Y, sz - 0.9, -1, 0, 'bus');
  anchor(c, 'busStop', sx, Y, sz, Math.PI); anchor(c, 'benches', sx - 0.3, Y + 0.5, sz + 0.42, Math.PI);
  c.solids.push([sx - 1.9, sz - 0.8, sx + 1.9, sz + 0.8, 2.6]);
  // ---- kerbside benches (x ≡ 9 mod 12 keeps 3 m from trees and lamps) + bins ----
  for (const x of [-99, -75, -15, 21, 69, 93]) { bench(c, x, Y, -6.0, Math.PI); bin(c, x + 1.5, Y, -5.75); }
  for (const x of [-87, -63, 69, 93]) { bench(c, x, Y, 6.0, 0); bin(c, x - 1.5, Y, 5.75, '#c8502f'); }
  // ---- hydrants, newspaper boxes, post box ----
  for (const [x, z] of [[-57, 5.5], [70.5, -5.5], [41.0, -30]]) { b.cyl(M('#d5412c'), 0.11, 0.1, 0.5, x, Y, z, 10); b.add(M('#d5412c'), new THREE.SphereGeometry(0.11, 10, 6), x, Y + 0.5, z); b.add(M('#f4efe2'), new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8), x, Y + 0.34, z, 0, Math.PI / 2); b.cyl(M('#b9392a'), 0.14, 0.14, 0.05, x, Y, z, 10); }
  ['#2a5fae', '#d5412c', '#f0a81e'].forEach((col, i) => { const x = -45 + i * 0.6; b.box(M(col), 0.5, 0.95, 0.45, x, Y + 0.12, 5.75); b.box(M('#27344a'), 0.4, 0.3, 0.02, x, Y + 0.68, 5.52); b.box(M('#3b424b'), 0.08, 0.12, 0.08, x, Y, 5.75); });
  b.cyl(M('#c8392b'), 0.26, 0.26, 1.1, 2.6, Y, -5.75, 14); b.add(M('#c8392b'), new THREE.SphereGeometry(0.26, 14, 8, 0, 6.3, 0, 1.6), 2.6, Y + 1.1, -5.75); b.box(M('#27344a'), 0.3, 0.04, 0.02, 2.6, Y + 0.9, -5.49);
  // ---- bollards at the corners and the mid-block crossing ----
  for (const [x, z] of [[39.6, 5.5], [39.6, -5.5], [56.4, -5.5], [43.0, -9.6], [53.0, -9.6], [43.0, 9.9], [-4.2, 5.5], [0.2, 5.5], [-4.2, -5.5], [0.2, -5.5]]) bollard(c, x, Y, z);
  // ---- bike racks ----
  bikeRack(c, 35, Y, 11.2, true, 6, 3); bikeRack(c, -33, Y, -6.1, true, 5, 4); bikeRack(c, 41.0, Y, 36, false, 4, 5); bikeRack(c, 81, Y, 6.1, true, 3, 6);
  // ---- cafés on the sidewalks ----
  [-23.5, -20.5, -17.5].forEach((x, i) => cafeSet(c, x, Y, -7.9, 0, ['#e2572b', '#f4efe2', '#2a8f86'][i]));
  [64, 67, 73].forEach((x, i) => cafeSet(c, x, Y, -7.9, 0, ['#f0a81e', '#2a5fae', '#f0a81e'][i]));
  [-68.5, -65.5].forEach((x) => cafeSet(c, x, Y, 8.0, 0, '#3f8a5a'));
  // ---- market stalls, A-frames, pots along the frontages ----
  stall(c, -9.5, Y, -9.3, 0, 'fruit', 11); stall(c, 12, Y, -9.3, 0, 'flower', 12); stall(c, -78, Y, 9.3, Math.PI, 'flower', 13); stall(c, 88, Y, -9.3, 0, 'fruit', 14); stall(c, 40.2, Y, -24, Math.PI / 2, 'fruit', 15);
  [[-40, -8.2, 0.3, '#27344a'], [-6, 8.4, 2.9, '#c8502f'], [26, -8.3, -0.2, '#3f8a5a'], [60.5, -8.2, 0.4, '#27344a'], [-92, 8.3, 3.3, '#2a6f8f'], [41.4, 22, 1.4, '#c8502f']].forEach(([x, z, ry, col]) => aFrame(c, x as number, Y, z as number, ry as number, col as string));
  const R = rng(99);
  for (let x = -112; x <= 104; x += 8) { if (x > 36 && x < 58) continue; pot(c, x + R.range(-1.5, 1.5), Y, -9.05, R.range(0.22, 0.3), 200 + x, R.pick(['#c9703f', '#e9e2d2', '#2a6f8f']), R() < 0.5 ? R.pick(['#f08aa8', '#f4d24a', '#ffffff']) : undefined); if (x < -26 || x > 58) pot(c, x + 3 + R.range(-1.5, 1.5), Y, 9.05, R.range(0.22, 0.3), 400 + x, R.pick(['#c9703f', '#e9e2d2', '#2a6f8f']), R() < 0.5 ? '#f08aa8' : undefined); }
  // ---- signs ----
  sign(c, -34.5, Y, 5.4, -1, 0, 'park'); sign(c, 28.5, Y, -5.4, 1, 0, 'park'); sign(c, 43.2, Y, -14, 0, -1, 'oneway'); sign(c, 78, Y, 5.4, -1, 0, 'park'); sign(c, 52.9, Y, 60.6, 0, -1, 'stop');
  void L;
}
