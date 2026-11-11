/** Splash-pad plaza, corner plaza, and the little kiosk used on plazas and the promenade. */
import * as THREE from 'three';
import { CURB, L } from '../layout';
import { type Ctx, M, anchor } from './kit';
import { bench, bin, planterBox, pot, cafeSet } from './props';
import { decal } from './surfaces';
import { painted, pavers } from './textures';

/** Small street kiosk (3 × 2.2 m) with a striped awning over the serving hatch on its local +Z side. */
export function kiosk(c: Ctx, x: number, y: number, z: number, ry: number, name: string, body = '#f0e6d2', stripe = '#e2572b') {
  const { b } = c, cs = Math.cos(ry), sn = Math.sin(ry), P = (lx: number, lz: number): [number, number] => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  b.box(M(body), 3, 2.3, 2.2, x, y, z, ry); b.box(M('#8a6a48'), 3.1, 0.5, 2.3, x, y, z, ry); b.box(M(stripe), 3.3, 0.16, 2.5, x, y + 2.3, z, ry);
  const front = painted('kiosk' + name, 256, 160, (g, w, h, R) => {
    g.fillStyle = '#27344a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f7e9c6'; g.fillRect(0, h - 36, w, 8);
    for (let i = 0; i < 9; i++) { g.fillStyle = R.pick(['#f0b03a', '#e2572b', '#f4efe2', '#6fb558', '#f08aa8', '#8fd0e6']); g.fillRect(8 + i * 27, h - 36 - R.range(14, 40), 20, 40); }
    g.fillStyle = '#e9d9b0'; for (let i = 0; i < 4; i++) g.fillRect(14 + i * 62, 12, 46, 34);
    g.fillStyle = '#8a6a48'; g.fillRect(0, h - 28, w, 28);
  });
  { const [px, pz] = P(0, 1.105); b.add(M('#ffffff', front, 'kf' + name), new THREE.PlaneGeometry(2.5, 1.5), px, y + 1.4, pz, ry); }
  const sign = painted('ksign' + name, 256, 64, (g, w, h) => { g.fillStyle = stripe; g.fillRect(0, 0, w, h); g.fillStyle = '#fff6e2'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 + 2); });
  { const [px, pz] = P(0, 1.27); b.add(M('#ffffff', sign, 'ks' + name), new THREE.PlaneGeometry(2.4, 0.5), px, y + 2.72, pz, ry); const [qx, qz] = P(0, 1.2); b.box(M(stripe), 2.5, 0.6, 0.1, qx, y + 2.42, qz, ry); }
  // striped awning: slanted slab made of alternating strips
  for (let i = 0; i < 8; i++) { const [px, pz] = P(-1.4 + (i + 0.5) * 0.35, 1.65); b.add(M(i % 2 ? '#f4efe2' : stripe), new THREE.BoxGeometry(0.35, 0.04, 1.15), px, y + 2.1, pz, ry, 0.32); }
  { const [px, pz] = P(0, 1.3); b.box(M('#c9a77c'), 2.6, 0.06, 0.5, px, y + 1.0, pz, ry); }
  const [ax, az] = P(0, 2.4); anchor(c, 'kiosks', ax, y, az, ry + Math.PI);
  c.solids.push([x - 1.9, z - 1.9, x + 1.9, z + 1.9, y + 2.5]);
}

export function buildPlazas2(c: Ctx) {
  const { b } = c, Y = CURB, sp = L.splash;
  // ---------- splash plaza ----------
  const pave = M('#ffffff', pavers('#e6dfd2', '#b8ae9f', 2, 2, 23, 0.035), 'spave'); b.ground(pave);
  b.flatQuad(pave, sp.x0, sp.z0, sp.x1, sp.z1, Y, 2.4);
  const wet = painted('wet', 256, 256, (g, w, h, R) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.5); grd.addColorStop(0, 'rgba(70,74,104,0.78)'); grd.addColorStop(0.72, 'rgba(70,74,104,0.66)'); grd.addColorStop(1, 'rgba(70,74,104,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(92,96,120,${R.range(0.2, 0.5)})`; const a = R() * 6.28, r = w * R.range(0.4, 0.5); g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, R.range(4, 14), R.range(3, 9), a, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(210,235,250,0.5)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(w / 2 + R.range(-0.3, 0.3) * w, h / 2 + R.range(-0.3, 0.3) * h, R.range(5, 16), R.range(2, 5), 0.5, 0, 7); g.fill(); }   // sky glints in the film of water
  });
  const wetM = decal('#ffffff', wet, true); b.flat(wetM);
  { const g = new THREE.PlaneGeometry((sp.pad.r + 1.4) * 2, (sp.pad.r + 1.4) * 2); g.rotateX(-Math.PI / 2); b.add(wetM, g, sp.pad.x, Y + 0.02, sp.pad.z); }
  const inlay = decal('#9fb7c4'); b.ground(inlay); b.add(inlay, new THREE.RingGeometry(sp.pad.r - 0.12, sp.pad.r + 0.06, 48), sp.pad.x, Y + 0.012, sp.pad.z, 0, -Math.PI / 2);
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = sp.pad.r + 0.75; b.add(decal(['#2a8f86', '#f0a81e', '#e2572b', '#f4efe2', '#2a6fe6'][i % 5]), new THREE.CircleGeometry(0.2, 6), sp.pad.x + Math.cos(a) * r, Y + 0.022, sp.pad.z + Math.sin(a) * r, a, -Math.PI / 2); }
  const steel = M('#aeb6bd'), hole = M('#2c3038');
  for (const [x, z] of sp.jets) { b.add(steel, new THREE.TorusGeometry(0.075, 0.018, 6, 14), x, Y + 0.012, z, 0, Math.PI / 2); b.cyl(hole, 0.06, 0.06, 0.012, x, Y + 0.003, z, 10); }
  anchor(c, 'splashPad', sp.pad.x, Y, sp.pad.z);
  for (const [x, z] of sp.jets) anchor(c, 'jets', x, Y, z);
  bench(c, sp.x0 + 2.2, Y, 14, Math.PI / 2); bench(c, sp.x1 - 2.2, Y, 15.5, -Math.PI / 2); bench(c, 12.5, Y, 20.6, Math.PI); bench(c, 22, Y, 20.6, Math.PI);
  bin(c, sp.x0 + 2.2, Y, 16.2); bin(c, 24, Y, 20.5, '#c8502f');
  planterBox(c, sp.x0 + 1.0, Y, 21.5, 0.9, 5.5, 0.55, 5, '#b7a58c', '#f08aa8'); planterBox(c, sp.x1 - 1.0, Y, 21.5, 0.9, 5.5, 0.55, 6, '#b7a58c', '#f4d24a');
  kiosk(c, 17.2, Y, 24.4, Math.PI, 'GELATO', '#f0e6d2', '#2a8f86');
  cafeSet(c, 11.2, Y, 23.6, 0.4, '#f0a81e'); cafeSet(c, 23.4, Y, 23.8, -0.5, '#e2572b');
  for (const [x, z, ry] of [[9.5, 11.5, 1.2], [24.5, 12.2, -1.5], [12, 18.4, 0.3], [21.5, 18.2, -0.4], [17.2, 21.6, 0], [26.5, 17.5, -1.57], [7.6, 18.5, 1.57]]) anchor(c, 'pedSpots', x, Y, z, ry);

  // ---------- corner plaza (between the splash plaza and Harbor Ave; the bank ramp stands on its street edge) ----------
  const brick = M('#ffffff', pavers('#c9805c', '#8f5a42', 6, 12, 27, 0.07, true), 'brick'); b.ground(brick);
  b.flatQuad(brick, 30, sp.z0, 40, sp.z1, Y, 2.4);
  planterBox(c, 30.2, Y, 17.5, 0.5, 14, 0.5, 7, '#b7a58c');                                 // low hedge dividing the two plazas
  planterBox(c, 35, Y, 24.9, 8, 1.2, 0.6, 8, '#b7a58c', '#ffffff');
  pot(c, 31.6, Y, 10.4, 0.34, 9, '#c9703f', '#f4d24a'); pot(c, 38.9, Y, 10.4, 0.34, 10, '#c9703f', '#f08aa8');
  bench(c, 35, Y, 23.6, Math.PI); bench(c, 38.9, Y, 17, -Math.PI / 2);
  // a low sculptural companion to the bank: three concrete drums
  for (const [x, z, r, h] of [[33.4, 14.2, 0.8, 0.45], [35.2, 15.4, 0.55, 0.75], [34.2, 16.6, 0.4, 0.3]]) { b.cyl(M('#d6cfc3'), r, r, h, x, Y, z, 20); c.solids.push([x - r, z - r, x + r, z + r, h]); }
  for (const [x, z, ry] of [[33, 20, 0.6], [37.2, 13.2, -2.2], [36.5, 20.5, 3.0]]) anchor(c, 'pedSpots', x, Y, z, ry);
}
