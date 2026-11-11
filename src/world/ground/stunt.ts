/** Exact stunt geometry at street level: roadworks barrier + cones, planter ledge, bank ramp. */
import * as THREE from 'three';
import { CURB, L, bankY } from '../layout';
import { type Ctx, M } from './kit';
import { decal } from './surfaces';
import { concrete, painted } from './textures';

/** A clump of low shrubs (flattened blobs, two leaf tones, optional flower dots). */
export function shrub(c: Ctx, x: number, y: number, z: number, r: number, seed: number, flower?: string) {
  const { b } = c, dark = M('#3f8a4a'), light = M('#6fb558');
  let s = seed * 9301 + 49297;
  const R = () => { s = (s * 233280 + 49297) % 1e9; return (s % 1000) / 1000; };
  for (let i = 0; i < 5; i++) {
    const a = R() * 6.28, d = R() * r * 0.55, rr = r * (0.45 + R() * 0.3);
    b.add(i % 2 ? light : dark, new THREE.IcosahedronGeometry(rr, 1), x + Math.cos(a) * d, y + rr * 0.62, z + Math.sin(a) * d, R() * 3, 0, 0, 1, 0.78, 1);
    if (flower) for (let k = 0; k < 3; k++) { const fa = R() * 6.28, fr = rr * 0.9; b.add(M(flower), new THREE.IcosahedronGeometry(0.045, 0), x + Math.cos(a) * d + Math.cos(fa) * fr * 0.7, y + rr * (0.9 + R() * 0.45), z + Math.sin(a) * d + Math.sin(fa) * fr * 0.7); }
  }
}

export function buildStunt(c: Ctx) {
  const { b } = c;
  // ---------- roadworks barrier + cones ----------
  const br = L.barrier, stripeTex = painted('hazard', 256, 32, (g, w, h) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#e2452b'; for (let i = -1; i < 9; i++) { g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 0); g.fill(); } });
  const plank = M('#ffffff', stripeTex, 'hazard'), leg = M('#e9a13a'), z0 = br.z - br.width / 2, z1 = br.z + br.width / 2;
  b.box(plank, 0.045, 0.2, br.width, br.x, br.height - 0.2, br.z);            // top plank: top edge exactly at height
  b.box(plank, 0.04, 0.12, br.width - 0.2, br.x, 0.2, br.z);
  for (const z of [z0 + 0.14, z1 - 0.14]) for (const s of [-1, 1]) b.add(leg, new THREE.BoxGeometry(0.05, br.height + 0.02, 0.07), br.x + s * 0.13, br.height / 2 - 0.01, z, 0, 0, s * 0.42);
  b.add(M('#f4c531'), new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), br.x, br.height - 0.1, z1 - 0.14, 0, 0, Math.PI / 2);     // warning lamp
  const cone = (x: number, z: number) => { const o = M('#ee6a2a'), w = M('#f4efe2'); b.box(o, 0.34, 0.03, 0.34, x, 0, z, 0.3); b.cyl(o, 0.13, 0.085, 0.2, x, 0.03, z, 12); b.cyl(w, 0.085, 0.06, 0.12, x, 0.23, z, 12); b.cyl(o, 0.06, 0.025, 0.17, x, 0.35, z, 12); };
  cone(br.x - 2.3, z0 - 0.15); cone(br.x - 2.3, z1 + 0.1); cone(br.x + 0.1, z1 + 0.42);
  const plate = decal('#59606b'); b.ground(plate); b.flatQuad(plate, br.x + 0.5, z0 + 0.2, br.x + 2.3, z1 - 0.1, 0.014, 1);   // steel road plate past the barrier
  b.flatQuad(decal('#3f3c46'), br.x + 0.56, z0 + 0.26, br.x + 0.7, z0 + 0.4, 0.016, 1);
  c.solids.push([br.x - 0.2, z0, br.x + 0.2, z1, br.height]);

  // ---------- planter ledge ----------
  const lg = L.ledge, top = CURB + lg.height, capM = M('#d9d4cc'), wallM = M('#ffffff', concrete('#c4b9a8', 7, 2), 'pl'), soil = M('#5b4636');
  const len = lg.x1 - lg.x0, zs = lg.z + lg.width / 2, back = 9.35;
  b.box(capM, len, 0.08, lg.width, (lg.x0 + lg.x1) / 2, top - 0.08, lg.z);                               // granite cap (top exactly at CURB+height)
  b.box(wallM, len - 0.06, lg.height - 0.08, lg.width - 0.08, (lg.x0 + lg.x1) / 2, CURB, lg.z);
  b.box(wallM, len, lg.height - 0.06, 0.16, (lg.x0 + lg.x1) / 2, CURB, back - 0.08);
  for (const x of [lg.x0 + 0.08, lg.x1 - 0.08]) b.box(wallM, 0.16, lg.height - 0.06, back - zs, x, CURB, (zs + back) / 2);
  b.flatQuad(soil, lg.x0 + 0.1, zs, lg.x1 - 0.1, back - 0.1, top - 0.14, 1);
  for (let i = 0; i < 9; i++) shrub(c, lg.x0 + 0.9 + i * 1.12, top - 0.16, 8.45 + (i % 2) * 0.3, 0.5, 40 + i, ['#f4d24a', '#f08aa8', '#ffffff'][i % 3]);
  c.solids.push([lg.x0, lg.z - lg.width / 2, lg.x1, back, top]);

  // ---------- bank ramp ----------
  const bk = L.bank, N = 28, pos: number[] = [], uv: number[] = [], sidePos: number[] = [];
  for (let i = 0; i < N; i++) {
    const xa = bk.x0 + ((bk.x1 - bk.x0) * i) / N, xb = bk.x0 + ((bk.x1 - bk.x0) * (i + 1)) / N, ya = bankY(xa), yb = bankY(xb);
    pos.push(xa, ya, bk.z0, xa, ya, bk.z1, xb, yb, bk.z1, xa, ya, bk.z0, xb, yb, bk.z1, xb, yb, bk.z0);
    uv.push(xa / 2, bk.z0 / 2, xa / 2, bk.z1 / 2, xb / 2, bk.z1 / 2, xa / 2, bk.z0 / 2, xb / 2, bk.z1 / 2, xb / 2, bk.z0 / 2);
    // vertical sides (north face looks -Z, south face looks +Z)
    sidePos.push(xa, 0, bk.z0, xa, ya, bk.z0, xb, yb, bk.z0, xa, 0, bk.z0, xb, yb, bk.z0, xb, 0, bk.z0);
    sidePos.push(xa, 0, bk.z1, xb, yb, bk.z1, xa, ya, bk.z1, xa, 0, bk.z1, xb, 0, bk.z1, xb, yb, bk.z1);
  }
  const yT = bankY(bk.x1);
  sidePos.push(bk.x1, 0, bk.z0, bk.x1, yT, bk.z0, bk.x1, yT, bk.z1, bk.x1, 0, bk.z0, bk.x1, yT, bk.z1, bk.x1, 0, bk.z1);   // east face
  const mk = (p: number[], u?: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); if (u) g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); else { const a: number[] = []; for (let i = 0; i < p.length; i += 3) a.push((p[i] + p[i + 2]) / 2, p[i + 1] / 2); g.setAttribute('uv', new THREE.Float32BufferAttribute(a, 2)); } g.computeVertexNormals(); return g; };
  const rampM = M('#ffffff', concrete('#d8d2c8', 9, 1), 'ramp'), sideM = M('#ffffff', concrete('#c2b8aa', 13, 2), 'rampside');
  b.add(rampM, mk(pos, uv)); b.add(sideM, mk(sidePos));
  // skate-waxed darker edges + lip, slightly proud of the surface
  const wax: number[] = [];
  for (let i = 0; i < N; i++) {
    const xa = bk.x0 + ((bk.x1 - bk.x0) * i) / N, xb = bk.x0 + ((bk.x1 - bk.x0) * (i + 1)) / N, ya = bankY(xa) + 0.004, yb = bankY(xb) + 0.004;
    for (const [za, zb] of [[bk.z0, bk.z0 + 0.14], [bk.z1 - 0.14, bk.z1]]) wax.push(xa, ya, za, xa, ya, zb, xb, yb, zb, xa, ya, za, xb, yb, zb, xb, yb, za);
  }
  const waxM = decal('#8f8a86'); b.ground(waxM); b.add(waxM, mk(wax));
  b.box(M('#77726f'), 0.07, 0.07, bk.z1 - bk.z0, bk.x1 - 0.035, yT - 0.07, (bk.z0 + bk.z1) / 2);        // steel coping at the lip (top flush)
  b.box(M('#b08a4a'), 0.5, 0.3, 0.02, bk.x0 + 5.2, 0.45, bk.z0 - 0.011);                                  // bronze plaque on the north face
  c.solids.push([bk.x0 + 3, bk.z0, bk.x1, bk.z1, yT]);
}
