/** Upper terrace (podium) and the broad staircase down to the promenade. */
import * as THREE from 'three';
import { CURB, L, STAIRS_Z1, STAIR_RISE, stairY } from '../layout';
import { type Ctx, M, anchor } from './kit';
import { cafeSet, globeLamp, planterBox, pot, railing } from './props';
import { shopfront } from './highwalk';
import { decal } from './surfaces';
import { concrete, painted, pavers } from './textures';

/** Painted podium wall bay: blind arch with a recessed door or window, rusticated base. */
function podiumBay(i: number) {
  return painted('podium' + (i % 3), 256, 256, (g, w, h, R) => {
    g.fillStyle = '#e4d6bd'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) { g.globalAlpha = R.range(0.1, 0.3); g.fillStyle = R() < 0.5 ? '#efe4cf' : '#cfbfa3'; g.beginPath(); g.ellipse(R() * w, R() * h, R.range(10, 50), R.range(5, 20), R() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#bfae92'; for (let y = h - 70; y < h; y += 23) g.fillRect(0, y, w, 2);      // rusticated base courses
    g.fillStyle = '#a8977c'; g.fillRect(0, 0, w, 10);
    g.fillStyle = '#7b4a35'; g.beginPath(); g.moveTo(58, h - 8); g.lineTo(58, 110); g.arc(w / 2, 110, 70, Math.PI, 0); g.lineTo(w - 58, h - 8); g.fill();   // arch recess
    g.fillStyle = i % 3 === 0 ? '#2f6f62' : i % 3 === 1 ? '#27405e' : '#8a3b2f'; g.beginPath(); g.moveTo(70, h - 8); g.lineTo(70, 112); g.arc(w / 2, 112, 58, Math.PI, 0); g.lineTo(w - 70, h - 8); g.fill();
    g.fillStyle = '#9fd0e8'; g.globalAlpha = 0.85; g.beginPath(); g.arc(w / 2, 112, 46, Math.PI, 0); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = '#e8dcc4'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 62); g.lineTo(w / 2, h - 8); g.moveTo(74, 118); g.lineTo(w - 74, 118); g.stroke();
  });
}

export function buildTerrace(c: Ctx) {
  const { b } = c, tr = L.terrace, st = L.stairs, Y = tr.y, hw = L.highwalk, bm = hw.beam;
  const conc = M('#ffffff', concrete('#d6cfc3', 17, 2), 'hw'), stone = M('#d9ccb4');
  const pave = M('#ffffff', pavers('#e6d8bf', '#b9a98f', 2, 2, 41, 0.04), 'terr'); b.ground(pave);
  b.flatQuad(pave, tr.x0, tr.z0, tr.x1, tr.z1, Y, 3);
  // inlaid darker band leading to the stairs
  const band = decal('#c9a77c'); b.ground(band); b.flatQuad(band, st.x0, tr.z1 - 0.9, st.x1, tr.z1 - 0.5, Y + 0.004, 1);
  const rose = painted('rosette', 512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2);
    g.fillStyle = '#c9a77c'; g.beginPath(); g.arc(0, 0, 250, 0, 7); g.fill(); g.fillStyle = '#efe3cc'; g.beginPath(); g.arc(0, 0, 228, 0, 7); g.fill();
    for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = i % 2 ? '#2a8f86' : '#d9703f'; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -110); g.lineTo(0, i % 2 ? -150 : -215); g.lineTo(-26, -110); g.fill(); }
    g.fillStyle = '#c9a77c'; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill(); g.fillStyle = '#27508f'; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill();
  });
  { const rm = decal('#ffffff', rose, true); b.flat(rm); const g = new THREE.PlaneGeometry(9, 9); g.rotateX(-Math.PI / 2); b.add(rm, g, 66, Y + 0.012, 49.5); }
  for (const z of [tr.z0 + 1.2, tr.z0 + 1.6]) b.flatQuad(band, hw.x1 + 0.5, z, tr.x1 - 0.6, z + 0.14, Y + 0.004, 1);
  // podium body: four painted walls (west on Harbor Ave, south beside the stairs, east, north stub)
  const H = Y - CURB, wall = (x0: number, z0: number, x1: number, z1: number, nx: number, nz: number, shops = false) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 4)), ry = Math.atan2(nx, nz);
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, g = new THREE.PlaneGeometry(len / n, H);
      b.add(M('#ffffff', shops && i % 2 === 0 ? shopfront(i + 3) : podiumBay(i), 'pb' + shops + (shops && i % 2 === 0 ? i : i % 3)), g, x0 + (x1 - x0) * k + nx * 0.01, CURB + H / 2, z0 + (z1 - z0) * k + nz * 0.01, ry);
    }
  };
  wall(tr.x0, tr.z1, tr.x0, tr.z0, -1, 0, true);                       // west face, continues the arcade shops
  wall(tr.x0, tr.z1, st.x0 - 0.6, tr.z1, 0, 1); wall(st.x1 + 0.6, tr.z1, tr.x1, tr.z1, 0, 1);
  wall(tr.x1, tr.z0, tr.x1, tr.z1, 1, 0); wall(tr.x1, tr.z0, hw.x1, tr.z0, 0, -1);
  b.box(M('#cdbfa6'), tr.x1 - tr.x0 - 0.04, H - 0.02, tr.z1 - tr.z0 - 0.04, (tr.x0 + tr.x1) / 2, CURB, (tr.z0 + tr.z1) / 2);   // solid core
  c.solids.push([tr.x0, tr.z0, tr.x1, tr.z1, Y]);
  // cornice + parapets/railings around the edge (stairs opening left clear)
  const cor = (x0: number, z0: number, x1: number, z1: number) => b.box(stone, Math.abs(x1 - x0) + 0.3, 0.2, Math.abs(z1 - z0) + 0.3, (x0 + x1) / 2, Y - 0.2, (z0 + z1) / 2);
  cor(tr.x0, tr.z0, tr.x0, tr.z1); cor(tr.x1, tr.z0, tr.x1, tr.z1); cor(tr.x0, tr.z1, st.x0 - 0.6, tr.z1); cor(st.x1 + 0.6, tr.z1, tr.x1, tr.z1);
  b.box(conc, bm.w, bm.h, tr.z1 - tr.z0, tr.x0 + bm.w / 2, Y, (tr.z0 + tr.z1) / 2);
  railing(c, tr.x0 + bm.w / 2, tr.z0, tr.x0 + bm.w / 2, tr.z1 - 0.2, Y + bm.h, 0.8);
  railing(c, tr.x0 + 0.3, tr.z1 - 0.2, st.x0 - 0.7, tr.z1 - 0.2, Y, 1.0); railing(c, st.x1 + 0.7, tr.z1 - 0.2, tr.x1 - 0.2, tr.z1 - 0.2, Y, 1.0);
  railing(c, tr.x1 - 0.2, tr.z0 + 0.2, tr.x1 - 0.2, tr.z1 - 0.2, Y, 1.0); railing(c, hw.x1 + 0.2, tr.z0 + 0.2, tr.x1 - 0.2, tr.z0 + 0.2, Y, 1.0);

  // ---------- stairs ----------
  const tread = M('#e9dfcb'), riser = M('#c7b79c'), sw = st.x1 - st.x0, sx = (st.x0 + st.x1) / 2;
  for (let i = 1; i < st.steps; i++) {
    const z0 = st.zTop + (i - 1) * st.run, y = stairY(z0 + st.run / 2);
    b.box(riser, sw, y - CURB - 0.03, st.run, sx, CURB, z0 + st.run / 2);                 // solid course under this tread
    b.box(tread, sw, 0.03, st.run + 0.025, sx, y - 0.03, z0 + st.run / 2 + 0.0125);                                         // tread with a small nosing
  }
  b.box(riser, sw, STAIR_RISE, 0.02, sx, Y - STAIR_RISE, st.zTop - 0.01);
  c.solids.push([st.x0, st.zTop, st.x1, STAIRS_Z1, Y]);
  // flank walls: stepped planters descending with the stairs
  for (const [x, s] of [[st.x0 - 0.35, -1], [st.x1 + 0.35, 1]] as [number, number][]) {
    const tiers = 4, tl = (STAIRS_Z1 - st.zTop + 0.4) / tiers;
    for (let k = 0; k < tiers; k++) {
      const z0 = st.zTop + k * tl, top = Math.max(CURB + 0.75, stairY(z0 + 0.01) + 0.55);
      b.box(conc, 0.7, top - CURB, tl, x, CURB, z0 + tl / 2); b.box(stone, 0.8, 0.07, tl + 0.06, x, top, z0 + tl / 2);
      for (let q = 0; q < 2; q++) pot(c, x + s * 0.0, top + 0.07, z0 + tl * (0.3 + q * 0.4), 0.2, 80 + k * 2 + q, '#b7a58c', q ? '#f08aa8' : '#f4d24a');
    }
    c.solids.push([x - 0.4, st.zTop, x + 0.4, STAIRS_Z1 + 0.4, Y + 0.6]);
  }
  // handrails at x≈62 and x≈70 only (lane x∈[64,68] stays clear)
  const steel = M('#4d5663');
  for (const x of [62, 70]) {
    const za = st.zTop + 0.1, zb = STAIRS_Z1 - 0.3, ya = Y + 0.9, yb = CURB + 0.9 + STAIR_RISE, len = Math.hypot(zb - za, ya - yb), pitch = Math.atan2(ya - yb, zb - za);
    b.add(steel, new THREE.BoxGeometry(0.05, 0.05, len), x, (ya + yb) / 2, (za + zb) / 2, 0, pitch);
    b.add(steel, new THREE.BoxGeometry(0.04, 0.04, len), x, (ya + yb) / 2 - 0.45, (za + zb) / 2, 0, pitch);
    for (let k = 0; k <= 4; k++) { const z = za + ((zb - za) * k) / 4, y = stairY(z); b.box(steel, 0.05, ya - (ya - yb) * (k / 4) - y, 0.05, x, y, z); }
  }
  // forecourt paving between the podium and the promenade
  const fore = M('#ffffff', pavers('#d9c9ad', '#a6957c', 4, 4, 43, 0.04), 'fore'); b.ground(fore);
  b.flatQuad(fore, tr.x0, tr.z1, tr.x1 + 4, 62, CURB, 2);

  // ---------- terrace life: café on the east part, planters; lane to the stairs centre kept clear ----------
  const umb = ['#e2572b', '#f4efe2', '#2a8f86', '#f0a81e'];
  let k = 0;
  for (const z of [45, 49, 53]) for (const x of [71.5, 75]) { cafeSet(c, x, Y, z + (x > 73 ? 1.2 : 0), k * 0.7, umb[k % 4]); k++; }
  planterBox(c, 77.0, Y, 56.6, 1.2, 1.6, 0.55, 91, '#b7a58c', '#f08aa8'); planterBox(c, 69.6, Y, 43.0, 2.4, 0.8, 0.55, 92, '#b7a58c', '#ffffff');
  planterBox(c, 74.5, Y, 43.0, 2.4, 0.8, 0.55, 93, '#b7a58c', '#f4d24a');
  globeLamp(c, 77.2, Y, 50, 3.4); globeLamp(c, 73.9, Y, 57.0, 3.4); globeLamp(c, 58.1, Y, 57.0, 3.4);
  for (const [x, z, ry] of [[70.2, 47, 1.2], [73.2, 51.5, -2], [76.4, 44.2, 2.6], [60, 56.6, 3.14], [76.5, 57.0, 2.9], [63, 43.2, 0]]) anchor(c, 'pedSpots', x, Y, z, ry);
  anchor(c, 'stairsTop', (st.x0 + st.x1) / 2, Y, st.zTop); anchor(c, 'stairsBottom', (st.x0 + st.x1) / 2, CURB, STAIRS_Z1);
}
