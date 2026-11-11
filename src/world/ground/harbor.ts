/** Things in the water: timber pier, moored boats (bobbing with world time), breakwater and lighthouse. */
import * as THREE from 'three';
import { rng } from '../../engine/look';
import { CURB, L } from '../layout';
import { Batch, type Ctx, M } from './kit';
import { pavers } from './textures';

/** Small boat hull: a box lattice tapered to a bow (local +Z) with sheer, flat transom. */
function hull(len: number, beam: number, depth: number) {
  const g = new THREE.BoxGeometry(beam, depth, len, 6, 3, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getZ(i) / (len / 2), v = p.getY(i) / (depth / 2);            // u: -1 stern … 1 bow, v: -1 keel … 1 gunwale
    const bow = Math.max(0, u), taper = (1 - Math.pow(bow, 2.2) * 0.96) * (0.62 + 0.38 * (v * 0.5 + 0.5)) * (1 - Math.max(0, -u - 0.7) * 0.5);
    p.setX(i, p.getX(i) * taper);
    p.setY(i, p.getY(i) + (v > 0 ? Math.pow(Math.abs(u), 2) * depth * 0.22 : 0) + (v < 0 ? bow * bow * depth * 0.35 : 0));
  }
  g.computeVertexNormals();
  return g;
}

function boat(c: Ctx, x: number, z: number, ry: number, kind: number, seed: number) {
  const R = rng(seed), grp = new THREE.Group(), b = new Batch();
  const colors = ['#f4efe2', '#2a6f8f', '#c8502f', '#f0a81e', '#3f8a5a'], main = colors[seed % colors.length], trim = colors[(seed + 2) % colors.length];
  const len = kind === 2 ? 8.5 : kind === 1 ? 6.2 : 4.4, beam = len * 0.34, depth = len * 0.16;
  b.add(M(main), hull(len, beam, depth), 0, depth * 0.18, 0);
  b.add(M(trim), hull(len * 1.01, beam * 1.03, depth * 0.16), 0, depth * 0.62, 0);                  // rub rail / sheer stripe
  b.box(M('#c9a77c'), beam * 0.78, 0.04, len * 0.7, 0, depth * 0.52, -len * 0.08);                   // deck
  if (kind >= 1) {
    b.box(M('#f4efe2'), beam * 0.62, 0.95, len * 0.26, 0, depth * 0.55, -len * 0.05); b.box(M(trim), beam * 0.7, 0.07, len * 0.3, 0, depth * 0.55 + 0.95, -len * 0.05);
    b.box(M('#27405e'), beam * 0.63, 0.34, len * 0.2, 0, depth * 0.55 + 0.45, -len * 0.045);
  }
  if (kind !== 1) { b.cyl(M('#8a6a48'), 0.05, 0.035, len * 0.85, 0, depth * 0.55, len * 0.12, 6); b.add(M('#8a6a48'), new THREE.BoxGeometry(0.05, 0.05, len * 0.5), 0, depth * 0.55 + 0.9, -len * 0.13); b.add(M('#f4efe2'), new THREE.CylinderGeometry(0.09, 0.09, len * 0.46, 8), 0, depth * 0.55 + 1.0, -len * 0.13, 0, Math.PI / 2); }
  else b.cyl(M('#f4efe2'), 0.02, 0.02, 1.6, 0, depth * 0.55 + 1.0, -len * 0.1, 5);
  for (const s of [-1, 1]) b.add(M('#e2572b'), new THREE.SphereGeometry(0.13, 8, 6), s * beam * 0.5, depth * 0.35, R.range(-1, 1) * len * 0.2, 0, 0, 0, 0.7, 1.3, 0.7);   // fenders
  b.build(grp);
  grp.position.set(x, L.water.y, z); grp.rotation.y = ry; c.group.add(grp);
  const ph = R() * 6.28;
  c.tick.push((tw) => { grp.position.y = L.water.y + Math.sin(tw * 1.1 + ph) * 0.06; grp.rotation.z = Math.sin(tw * 0.8 + ph * 1.3) * 0.035; grp.rotation.x = Math.sin(tw * 0.63 + ph * 0.7) * 0.02; });
  (c.anchors.boats ??= []).push({ x, y: L.water.y, z, ry });
}

export function buildHarbor(c: Ctx) {
  const { b } = c, pr = L.promenade, wy = L.water.y;
  // timber pier off the quay (west of the stairs so the final wide shots have it)
  const wood = M('#b98a5a'), woodD = M('#8a6646'), px = -20, pw = 3.4, pz0 = pr.z1 + 0.1, pz1 = pr.z1 + 30, py = CURB - 0.35;
  b.box(wood, pw, 0.14, pz1 - pz0, px, py - 0.14, (pz0 + pz1) / 2);
  for (let z = pz0 + 0.3; z < pz1; z += 0.55) b.box(woodD, pw + 0.04, 0.012, 0.05, px, py, z);                    // plank gaps read as lines
  for (let z = pz0 + 1; z <= pz1; z += 4.8) for (const s of [-1, 1]) { b.cyl(woodD, 0.16, 0.14, py - wy + 2.2, px + s * (pw / 2 - 0.1), wy - 1.5, z, 8); b.cyl(M('#e9e2d2'), 0.15, 0.15, 0.1, px + s * (pw / 2 - 0.1), py + 0.62, z, 8); }
  for (const s of [-1, 1]) b.box(woodD, 0.06, 0.06, pz1 - pz0 - 2, px + s * (pw / 2 - 0.1), py + 0.45, (pz0 + pz1) / 2 + 0.5);
  b.box(wood, 2.2, 0.1, 1.2, px, CURB - 0.25, pr.z1 - 0.2);                                                    // step down from the quay (gap in the balustrade is implied behind it)
  b.box(M('#f4efe2'), 2.4, 2.1, 2.6, px, py, pz1 - 2); b.add(M('#c8502f'), new THREE.ConeGeometry(2.2, 1.1, 4), px, py + 2.65, pz1 - 2, Math.PI / 4);   // boat-hire hut at the pier head
  b.box(M('#27405e'), 1.2, 0.9, 0.05, px, py + 0.9, pz1 - 3.32);
  c.solids.push([px - pw / 2, pz0, px + pw / 2, pz1, CURB]);
  // boats: along the pier, off the quay, a couple further out
  boat(c, px - 3.6, pr.z1 + 9, 0.1, 0, 1); boat(c, px + 3.9, pr.z1 + 15, 3.0, 1, 2); boat(c, px - 4.0, pr.z1 + 22, -0.1, 0, 3);
  boat(c, 14, pr.z1 + 4.2, 1.52, 1, 4); boat(c, 38, pr.z1 + 3.8, 1.62, 0, 5); boat(c, 88, pr.z1 + 4.6, 1.5, 2, 6); boat(c, 104, pr.z1 + 3.9, -1.6, 0, 7);
  boat(c, 58, pr.z1 + 46, 0.9, 2, 8); boat(c, 5, pr.z1 + 70, -2.2, 1, 9); boat(c, 150, pr.z1 + 90, 2.0, 2, 10);
  // mooring buoys
  for (const [x, z] of [[30, 26], [70, 20], [48, 60], [-45, 34], [110, 40]]) { b.add(M('#e2572b'), new THREE.SphereGeometry(0.35, 10, 8), x, wy + 0.08, pr.z1 + z); b.cyl(M('#f4efe2'), 0.36, 0.36, 0.1, x, wy + 0.06, pr.z1 + z, 10); }
  // breakwater: rubble mole running south from the east end of the promenade, lighthouse at its tip
  const rock = M('#ffffff', pavers('#a79c8d', '#6f665b', 3, 3, 61, 0.09, true), 'rock'), R = rng(62), bx = 128;
  b.box(rock, 6.5, 2.6 - wy, 132, bx, wy - 1, pr.z1 + 66); b.box(M('#d6cfc3'), 3.2, 0.25, 130, bx, 1.6, pr.z1 + 65);
  for (let i = 0; i < 70; i++) { const z = pr.z1 + 2 + R() * 128, s = R.sign(), r = R.range(0.9, 1.9); b.add(i % 2 ? M('#9b9082') : M('#857b6e'), new THREE.IcosahedronGeometry(r, 0), bx + s * R.range(3.2, 4.6), wy + r * 0.25, z, R() * 3, R() * 3); }
  const lz = pr.z1 + 134, wh = M('#f4efe2'), rd = M('#d5412c');
  b.cyl(M('#b9ad9c'), 4.2, 3.6, 2.8 - wy, bx, wy - 1, lz, 14);
  for (let i = 0; i < 5; i++) b.cyl(i % 2 ? rd : wh, 1.7 - i * 0.16, 1.7 - (i + 1) * 0.16, 2.6, bx, 1.8 + i * 2.6, lz, 14);
  b.cyl(M('#3f4650'), 1.25, 1.25, 0.18, bx, 14.8, lz, 14); b.cyl(M('#ffe9a8'), 0.62, 0.62, 1.3, bx, 14.98, lz, 10); b.add(rd, new THREE.ConeGeometry(0.95, 1.0, 12), bx, 16.78, lz);
  for (let i = 0; i < 8; i++) b.cyl(M('#3f4650'), 0.03, 0.03, 0.8, bx + Math.cos(i * 0.785) * 1.2, 14.98, lz + Math.sin(i * 0.785) * 1.2, 4);
  (c.anchors.lighthouse ??= []).push({ x: bx, y: 15.6, z: lz });
}
