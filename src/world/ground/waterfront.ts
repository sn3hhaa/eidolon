/** Waterfront promenade: paving, quay wall, balustrade, palms, benches, lamps, bollards. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, rng } from '../../engine/look';
import { CURB, L } from '../layout';
import { type Ctx, M, anchor } from './kit';
import { bench, bin, bollard, globeLamp, railing } from './props';
import { painted, pavers } from './textures';
import { decal } from './surfaces';

/** One arching palm frond as a folded, tapered strip starting at the origin, pointing along +X then drooping. */
function frond(len: number, droop: number, seed: number) {
  const R = rng(seed), N = 7, pos: number[] = [], P = (u: number, side: number) => {
    const w = 0.42 * Math.pow(Math.sin(Math.PI * Math.min(0.97, u * 0.9 + 0.08)), 0.7), x = len * u * (1 - 0.18 * u), y = 0.55 * len * u * (1 - u) * 1.2 - droop * u * u;
    return [x, y - Math.abs(side) * w * 0.45, side * w];
  };
  for (let i = 0; i < N; i++) for (const s of [-1, 1]) {
    const u0 = i / N, u1 = (i + 1) / N, a = P(u0, 0), bb = P(u1, 0), c0 = P(u0, s), c1 = P(u1, s);
    if (s > 0) pos.push(...a, ...c0, ...c1, ...a, ...c1, ...bb); else pos.push(...a, ...c1, ...c0, ...a, ...bb, ...c1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  g.rotateX(R.range(-0.25, 0.25));
  return g;
}

/** Palm: ringed trunk (batched) + a crown mesh that sways with world time. */
export function palm(c: Ctx, x: number, y: number, z: number, h: number, seed: number) {
  const { b } = c, R = rng(seed), trunk = M('#a9865f'), ring = M('#8a6a48'), lean = R.range(-0.5, 0.5), dir = R() * 6.28;
  let px = x, pz = z;
  const S = 7;
  for (let i = 0; i < S; i++) {
    const k = i / S, r0 = 0.2 - k * 0.07, sh = h / S, off = lean * Math.pow((i + 1) / S, 2) - lean * Math.pow(k, 2);
    b.add(i % 2 ? trunk : ring, new THREE.CylinderGeometry(r0 - 0.012, r0, sh, 8), px, y + sh * (i + 0.5), pz);
    px += Math.cos(dir) * off; pz += Math.sin(dir) * off;
  }
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) { const g = frond(R.range(2.3, 3.1), R.range(1.2, 2.4), seed * 31 + i); g.rotateZ(R.range(0.1, 0.7)); g.rotateY((i / 11) * Math.PI * 2 + R.range(-0.2, 0.2)); parts.push(g); }
  for (let i = 0; i < 4; i++) { const g = new THREE.IcosahedronGeometry(0.13, 0); g.translate(Math.cos(i * 1.6) * 0.22, -0.2, Math.sin(i * 1.6) * 0.22); parts.push(g.toNonIndexed()); }
  const geo = mergeGeometries(parts.map((p) => { for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k); return p; }))!;
  const crown = new THREE.Mesh(geo, palmMat()); crown.position.set(px, y + h, pz); crown.castShadow = true; c.group.add(crown);
  const ph = R() * 6.28;
  c.tick.push((tw) => { crown.rotation.set(Math.sin(tw * 0.9 + ph) * 0.035, 0, Math.sin(tw * 0.7 + ph * 1.7) * 0.045); });
  c.solids.push([x - 0.3, z - 0.3, x + 0.3, z + 0.3, y + h]);
}
let _palm: THREE.Material | null = null;
const palmMat = () => (_palm ??= toon('#4f9a4e', { side: THREE.DoubleSide }));

export function buildWaterfront(c: Ctx) {
  const { b } = c, pr = L.promenade, Y = CURB, X0 = -200, X1 = 260;
  const pave = M('#ffffff', painted('prom', 512, 512, (g, w, h, R) => {
    g.fillStyle = '#b9a688'; g.fillRect(0, 0, w, h);
    const n = 8, s = w / n;
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const band = ix === 0, col = new THREE.Color(band ? '#c98f62' : '#ead9b8').offsetHSL(R.range(-0.01, 0.01), 0, R.range(-0.04, 0.04));
      g.fillStyle = `#${col.getHexString()}`; g.fillRect(ix * s + 1.5, iy * s + 1.5, s - 3, s - 3);
    }
  }, true), 'prom'); b.ground(pave);
  b.flatQuad(pave, X0, pr.z0, X1, pr.z1 - 0.7, Y, 4);
  const border = decal('#c98f62'); b.ground(border); b.flatQuad(border, X0, pr.z1 - 2.1, X1, pr.z1 - 1.7, Y + 0.004, 1);
  // quay: cap stone, wall down into the water
  const quayM = M('#ffffff', pavers('#b9ad9c', '#857a6c', 4, 4, 51, 0.06, true), 'quay'), cap = M('#ddd5c6');
  b.box(cap, X1 - X0, Y + 0.1, 0.8, (X0 + X1) / 2, 0, pr.z1 - 0.3);
  const wg = new THREE.PlaneGeometry(X1 - X0, 5); { const uv = wg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (X1 - X0) / 3, uv.getY(i) * 5 / 3); }
  b.add(quayM, wg, (X0 + X1) / 2, -2.5, pr.z1 + 0.1);
  b.box(M('#5f6b4e'), X1 - X0, 0.5, 0.06, (X0 + X1) / 2, L.water.y - 0.1, pr.z1 + 0.12);        // algae tide line
  // balustrade: stone piers every 6 m with steel rails between (story range), plain beyond
  const pier = M('#e3dac9'), rail = M('#3f5560');
  for (let x = -96; x <= 162; x += 6) { b.box(pier, 0.36, 1.0, 0.36, x, Y + 0.1, pr.z1 - 0.3); b.box(cap, 0.46, 0.08, 0.46, x, Y + 1.1, pr.z1 - 0.3); b.add(cap, new THREE.SphereGeometry(0.13, 10, 8), x, Y + 1.26, pr.z1 - 0.3); }
  for (const h of [0.38, 0.68, 0.98]) b.box(rail, 258, h > 0.9 ? 0.06 : 0.035, h > 0.9 ? 0.08 : 0.035, 33, Y + 0.1 + h - 0.03, pr.z1 - 0.3);
  for (let x = -93; x < 162; x += 1.0) if (Math.abs(((x + 96) % 6) - 3) < 2.6) b.box(rail, 0.025, 0.95, 0.025, x, Y + 0.1, pr.z1 - 0.3);
  for (let x = -90; x <= 150; x += 12) { b.cyl(M('#2f3640'), 0.13, 0.1, 0.32, x + 3, Y + 0.1, pr.z1 + 0.0, 10); b.cyl(M('#2f3640'), 0.17, 0.17, 0.07, x + 3, Y + 0.42, pr.z1 + 0.0, 10); }   // mooring bollards on the cap
  // lamps, benches, bins along the sea edge; landing zone x∈[59,75] and the z 72‥80 strip stay clear
  for (let x = -91; x <= 150; x += 14) {
    const clear = x > 57 && x < 77;
    if (!clear) globeLamp(c, x, Y, pr.z1 - 1.25, 3.6);
    if (!clear && Math.abs(x + 7 - 66) > 10) { bench(c, x + 7, Y, pr.z1 - 2.6, 0); if ((x + 91) % 28 === 0) bin(c, x + 8.4, Y, pr.z1 - 2.5); }
  }
  // palms + round planters along the city side of the promenade
  let k = 0;
  for (let x = -88; x <= 150; x += 11) {
    if ((x > 41 && x < 55) || (x > 56 && x < 79)) continue;
    palm(c, x, Y, pr.z0 + 3.1, 6.2 + (k % 3) * 0.7, 300 + k);
    b.cyl(M('#d8ccb6'), 0.95, 1.0, 0.38, x, Y, pr.z0 + 3.1, 16); b.cyl(M('#5b4636'), 0.86, 0.86, 0.02, x, Y + 0.37, pr.z0 + 3.1, 16);
    c.solids.push([x - 1, pr.z0 + 2.1, x + 1, pr.z0 + 4.1, 0.6]); k++;
  }
  // bollards closing Harbor Ave onto the promenade
  for (let x = 44; x <= 52.2; x += 1.6) bollard(c, x, Y, pr.z0 + 0.5);
  const kerb = M('#c9c4bd'); b.box(kerb, 9, Y + 0.012, 0.28, L.harbor.x, 0, pr.z0 - 0.14);
  b.box(kerb, 43.5 - X0, Y + 0.012, 0.28, (X0 + 43.5) / 2, 0, pr.z0 - 0.14); b.box(kerb, X1 - 82, Y + 0.012, 0.28, (X1 + 82) / 2, 0, pr.z0 - 0.14);
  // seaside railing-side telescope + life ring post (small landmarks)
  b.cyl(M('#3f5560'), 0.05, 0.05, 1.2, 30, Y, pr.z1 - 1.3, 8); b.add(M('#c8502f'), new THREE.CylinderGeometry(0.09, 0.07, 0.42, 10), 30, Y + 1.3, pr.z1 - 1.3, 0, 1.3);
  b.box(M('#f4efe2'), 0.08, 1.5, 0.08, 96, Y, pr.z1 - 1.1); b.add(M('#e2452b'), new THREE.TorusGeometry(0.26, 0.07, 8, 18), 96, Y + 1.25, pr.z1 - 1.18);
  for (const [x, z, ry] of [[-30, 70, 1.57], [-12, 80.6, 0], [8, 67, -1.57], [22, 80.8, 0.2], [34, 69, 1.57], [40, 81, -0.2], [54, 66, 3.14], [82, 68, -1.57], [90, 80.8, 0], [104, 70, 1.57], [118, 81, 0.1], [57, 81.2, 0.3], [78, 81.4, -0.3], [48, 72, 1.57]]) anchor(c, 'pedSpots', x, Y, z, ry);
  anchor(c, 'landing', 66, Y, 68, 0);
  void railing;
}
