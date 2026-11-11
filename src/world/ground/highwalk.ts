/** The High Walk: raised pedestrian deck on an arcade along the east side of Harbor Ave. */
import * as THREE from 'three';
import { CURB, L } from '../layout';
import { type Ctx, M, anchor } from './kit';
import { bench, globeLamp, planterBox, railing } from './props';
import { concrete, painted, pavers } from './textures';

const NAMES = ['KOPI', 'BLOOM', 'RIVET', 'TIDE', 'LOOP', 'MOSS', 'ANKER', 'PAPEL', 'SOL', 'FIG'];
const TONES = ['#2a6f8f', '#c8502f', '#3f8a5a', '#d79a2b', '#7a4f9a', '#b83b5e', '#2f5fae', '#4a6b3a'];

/** One painted arcade shopfront bay (fascia + window with display + door). */
export function shopfront(i: number) {
  return painted('shop' + i, 512, 288, (g, w, h, R) => {
    const tone = TONES[i % TONES.length];
    g.fillStyle = '#efe6d6'; g.fillRect(0, 0, w, h);
    g.fillStyle = tone; g.fillRect(0, 0, w, 62);                                    // fascia
    g.fillStyle = '#fff6e2'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(NAMES[i % NAMES.length], w / 2, 33);
    g.fillStyle = '#3a4250'; g.fillRect(0, 62, w, 6);
    const door = i % 2 ? 40 : w - 150;                                               // door left or right
    const wx = i % 2 ? 170 : 30, ww = w - 200;
    g.fillStyle = '#2b3d55'; g.fillRect(wx, 86, ww, 150);                            // window glass
    const grd = g.createLinearGradient(wx, 86, wx + ww, 236); grd.addColorStop(0, '#8fc3e6'); grd.addColorStop(0.45, '#4f7fa8'); grd.addColorStop(1, '#27405e');
    g.fillStyle = grd; g.fillRect(wx + 5, 91, ww - 10, 140);
    g.fillStyle = '#f7e9c6'; g.globalAlpha = 0.9;                                    // lit interior shelf + goods
    g.fillRect(wx + 12, 190, ww - 24, 8);
    for (let k = 0; k < 7; k++) { g.fillStyle = R.pick(['#f0b03a', '#e2572b', '#f4efe2', '#6fb558', '#d6427a', '#8fd0e6']); const bx = wx + 20 + k * ((ww - 50) / 7); g.fillRect(bx, 190 - R.range(18, 46), R.range(14, 26), 46); }
    g.globalAlpha = 0.5; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(wx + 20, 91); g.lineTo(wx + 70, 91); g.lineTo(wx + 20, 190); g.fill(); g.globalAlpha = 1;
    g.fillStyle = tone; g.fillRect(wx - 6, 236, ww + 12, 10);
    g.fillStyle = '#c9bca6'; g.fillRect(wx - 6, 246, ww + 12, 42);                    // stall riser
    g.fillStyle = '#5a3f2c'; g.fillRect(door, 80, 110, 208);                          // door
    g.fillStyle = '#7fb0d6'; g.fillRect(door + 14, 94, 82, 110);
    g.fillStyle = '#e6c15a'; g.fillRect(door + 92, 196, 8, 22);
    g.fillStyle = '#3a4250'; g.fillRect(0, h - 6, w, 6);
  });
}

export function buildHighWalk(c: Ctx) {
  const { b } = c, hw = L.highwalk, Y = hw.y, bm = hw.beam, top = Y + bm.h;
  const conc = M('#ffffff', concrete('#d6cfc3', 17, 2), 'hw'), concD = M('#ffffff', concrete('#bdb3a5', 19, 2), 'hwd');
  const deckM = M('#ffffff', pavers('#dfd3bd', '#b3a591', 4, 2, 31, 0.05, true), 'hwdeck'); b.ground(deckM);
  const zlen = hw.z1 - hw.z0, zc = (hw.z0 + hw.z1) / 2, xc = (hw.x0 + hw.x1) / 2;
  b.box(concD, hw.x1 - hw.x0 - 0.1, 0.38, zlen, xc, Y - 0.39, zc);                           // slab
  b.flatQuad(deckM, hw.x0 + bm.w, hw.z0 + bm.w, hw.x1 - bm.w, hw.z1, Y, 2);
  // edge beams (west beam is the grind/fly-over edge: top exactly at y + beam.h)
  b.box(conc, bm.w, top - (Y - 0.5), zlen, hw.x0 + bm.w / 2, Y - 0.5, zc);
  b.box(conc, bm.w, top - (Y - 0.5), zlen, hw.x1 - bm.w / 2, Y - 0.5, zc);
  b.box(conc, hw.x1 - hw.x0, top - (Y - 0.5), bm.w, xc, Y - 0.5, hw.z0 + bm.w / 2);
  // railings: none on the west beam for z∈[5,22]
  railing(c, hw.x0 + bm.w / 2, 22, hw.x0 + bm.w / 2, hw.z1, top, 0.8);
  railing(c, hw.x1 - bm.w / 2, hw.z0 + 0.2, hw.x1 - bm.w / 2, hw.z1, top, 0.8);
  railing(c, hw.x0 + 2.6, hw.z0 + bm.w / 2, hw.x1 - 0.2, hw.z0 + bm.w / 2, top, 0.8);
  // arcade: columns + arched spandrels on the west face, shopfront wall set back under the deck
  const n = 9, z0 = hw.z0 + 0.3, sp = (hw.z1 - 0.3 - z0) / n, col = 0.5, baseY = CURB, under = Y - 0.5;
  const arch = new THREE.Shape(); arch.moveTo(0, 0); arch.lineTo(0, 0.5); arch.lineTo(sp, 0.5); arch.lineTo(sp, 0); arch.lineTo(sp - col / 2, 0); arch.quadraticCurveTo(sp / 2, 0.78, col / 2, 0); arch.lineTo(0, 0);
  for (let i = 0; i <= n; i++) {
    const z = z0 + i * sp;
    b.box(conc, col, under - baseY - 0.5, col, hw.x0 + 0.27, baseY, z); b.box(concD, col + 0.12, 0.22, col + 0.12, hw.x0 + 0.27, baseY, z); b.box(concD, col + 0.1, 0.1, col + 0.1, hw.x0 + 0.27, under - 0.6, z);
    c.solids.push([hw.x0, z - 0.3, hw.x0 + 0.55, z + 0.3, top]);
    if (i < n) {
      const g = new THREE.ExtrudeGeometry(arch, { depth: 0.4, bevelEnabled: false, curveSegments: 10 }); g.rotateY(-Math.PI / 2);
      b.add(conc, g, hw.x0 + 0.45, under - 0.5, z);
      const wallX = hw.x0 + 3.3, pg = new THREE.PlaneGeometry(sp, under - baseY);
      b.add(M('#ffffff', shopfront(i), 'sf' + i), pg, wallX - 0.01, baseY + (under - baseY) / 2, z + sp / 2, -Math.PI / 2);
      if (i % 3 === 1) anchor(c, 'arcadeDoors', wallX - 0.6, baseY, z + sp / 2, -Math.PI / 2);
    }
  }
  b.box(concD, hw.x1 - hw.x0 - 3.3, under - baseY, zlen - 0.2, hw.x0 + 3.3 + (hw.x1 - hw.x0 - 3.3) / 2, baseY, zc);   // solid behind the shops
  b.box(conc, 3.3, under - baseY, 0.3, hw.x0 + 1.65, baseY, hw.z1 - 0.15);                                             // closes the arcade at the terrace
  const floor = M('#ffffff', pavers('#c9bca8', '#978a7a', 4, 4, 37, 0.04), 'arc'); b.ground(floor);
  b.flatQuad(floor, hw.x0, 9.5, hw.x0 + 3.3, hw.z1, CURB, 2);
  c.solids.push([hw.x0 + 3.3, hw.z0, hw.x1, hw.z1, top]);
  // hanging lanterns under the arcade + deck furniture (east half only: the west 2.6 m lane stays clear)
  for (let i = 0; i < n; i += 2) { const z = z0 + (i + 0.5) * sp; b.cyl(M('#3b424b'), 0.01, 0.01, 0.35, hw.x0 + 1.7, under - 0.35, z, 4); b.add(M('#ffe9b0'), new THREE.SphereGeometry(0.13, 10, 8), hw.x0 + 1.7, under - 0.45, z); }
  for (let i = 0; i < 5; i++) {
    const z = hw.z0 + 4 + i * 7.4;
    planterBox(c, hw.x1 - 0.95, Y, z, 0.7, 2.2, 0.5, 60 + i, '#b7a58c', ['#f08aa8', '#f4d24a', '#ffffff'][i % 3]);
    if (i < 4) { bench(c, hw.x1 - 1.0, Y, z + 3.7, -Math.PI / 2); if (i % 2 === 0) globeLamp(c, hw.x1 - 0.85, Y, z + 1.9, 3.2); }
  }
  for (let i = 0; i < 6; i++) anchor(c, 'pedSpots', hw.x1 - 1.9 - (i % 2) * 0.5, Y, hw.z0 + 6 + i * 5.6, i % 2 ? Math.PI : 0);
}
