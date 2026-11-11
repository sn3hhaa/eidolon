/** Court plaza, splash plaza, corner plaza: paving and their fixed features. */
import * as THREE from 'three';
import { toon } from '../../engine/look';
import { CURB, L } from '../layout';
import { type Ctx, M, anchor } from './kit';
import { decal } from './surfaces';
import { painted, pavers } from './textures';

export function buildPlazas(c: Ctx) {
  const { b } = c, Y = CURB;
  // ---------- court plaza ----------
  const ct = L.court, hoop = ct.hoop;
  const cpave = M('#ffffff', pavers('#cdbfae', '#9c8f80', 3, 6, 21, 0.05, true), 'cpave'); b.ground(cpave);
  b.flatQuad(cpave, ct.x0, ct.z0, ct.x1, ct.z1, Y, 1.8);
  // painted half-court (15 × 14 m), baseline on the south side under the hoop
  const CW = 15, CL = 14, bz = hoop.z + 1.2, cx = hoop.x;
  const courtTex = painted('court', 1024, 1024, (g, w, h, R) => {
    const s = w / CW;                                   // px per metre; v=0 is the far (north) end, baseline at the bottom
    g.fillStyle = '#2f8f86'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.globalAlpha = R.range(0.08, 0.22); g.fillStyle = R() < 0.5 ? '#3aa398' : '#27786f'; g.beginPath(); g.ellipse(R() * w, R() * h, R.range(20, 120), R.range(8, 40), R() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    const hx = w / 2, hy = h * (CL / CW) - 1.2 * s, by = h * (CL / CW);
    g.fillStyle = '#d9703f'; g.fillRect(hx - 2.45 * s, by - 5.8 * s, 4.9 * s, 5.8 * s);        // the key
    g.beginPath(); g.arc(hx, by - 5.8 * s, 1.8 * s, Math.PI, 0); g.fill();
    g.strokeStyle = '#f4efe2'; g.lineWidth = 0.09 * s; g.lineCap = 'butt';
    g.strokeRect(0.05 * s, 0.05 * s, w - 0.1 * s, by - 0.1 * s);
    g.strokeRect(hx - 2.45 * s, by - 5.8 * s, 4.9 * s, 5.8 * s);
    g.beginPath(); g.arc(hx, by - 5.8 * s, 1.8 * s, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(hx - 6.6 * s, by); g.arc(hx, hy, 6.75 * s, -Math.PI + 0.212, -0.212, false); g.lineTo(hx + 6.6 * s, by); g.stroke();
    g.beginPath(); g.arc(hx, 0, 1.8 * s, 0, Math.PI); g.stroke();
    g.beginPath(); g.arc(hx, hy, 1.25 * s, Math.PI, 0); g.stroke();
    for (let i = 0; i < 26; i++) { g.globalAlpha = R.range(0.15, 0.35); g.fillStyle = '#1f5f58'; g.fillRect(R() * w, R() * h, R.range(20, 90), R.range(2, 5)); }   // scuffs
  });
  courtTex.wrapS = courtTex.wrapT = THREE.ClampToEdgeWrapping;
  const cg = new THREE.PlaneGeometry(CW, CW); cg.rotateX(-Math.PI / 2);
  // plane v=1 is at -Z (north); canvas top (v=1 after flipY) is the far end ✓. Trim to CL metres with uv.
  { const p = cg.attributes.position, uv = cg.attributes.uv; for (let i = 0; i < p.count; i++) { if (p.getZ(i) > 0) { p.setZ(i, CL - CW / 2); uv.setY(i, 1 - CL / CW); } } }
  const cmat = decal('#ffffff', courtTex); b.ground(cmat);
  b.add(cmat, cg, cx, Y + 0.012, bz - CL + CW / 2);
  // hoop: post behind the baseline, arm, backboard, rim, net
  const steel = M('#5d6470'), boardM = M('#f3f0e8'), rimM = M('#e2572b');
  b.cyl(steel, 0.09, 0.07, 3.6, hoop.x, Y, bz + 0.6, 10);
  b.add(steel, new THREE.BoxGeometry(0.1, 0.1, 1.25), hoop.x, 3.42 + Y, bz + 0.05, 0, 0.32);
  b.box(boardM, 1.8, 1.05, 0.05, hoop.x, hoop.rimY - 0.15, hoop.z + 0.38);
  b.box(rimM, 0.62, 0.47, 0.012, hoop.x, hoop.rimY, hoop.z + 0.35);                       // painted target square (thin, proud of the board)
  b.box(boardM, 0.5, 0.35, 0.02, hoop.x, hoop.rimY + 0.06, hoop.z + 0.345);
  b.add(rimM, new THREE.TorusGeometry(0.23, 0.014, 6, 24), hoop.x, hoop.rimY, hoop.z, 0, Math.PI / 2);
  b.box(rimM, 0.08, 0.03, 0.16, hoop.x, hoop.rimY - 0.015, hoop.z + 0.29);
  const netTex = painted('net', 128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#f7f4ec'; g.lineWidth = 5; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 64, h); g.stroke(); g.beginPath(); g.moveTo(i * 32 + 64, 0); g.lineTo(i * 32, h); g.stroke(); } }, true);
  const netM = toon('#ffffff', { map: netTex, alphaTest: 0.35, side: THREE.DoubleSide });
  const net = new THREE.CylinderGeometry(0.225, 0.14, 0.42, 12, 1, true); { const uv = net.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 6); }
  b.add(netM, net, hoop.x, hoop.rimY - 0.215, hoop.z); b.flat(netM);
  anchor(c, 'hoop', hoop.x, hoop.rimY, hoop.z, Math.PI);
  // chain-link fence: south side full width, west side for the back half; posts + alpha mesh
  const linkTex = painted('link', 64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#9aa3ab'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }, true);
  const linkM = toon('#ffffff', { map: linkTex, alphaTest: 0.3, side: THREE.DoubleSide }); b.flat(linkM);
  const FH = 3.6, post = M('#6f7780');
  const fence = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), g = new THREE.PlaneGeometry(len, FH - 0.15);
    { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 7, uv.getY(i) * FH * 7); }
    b.add(linkM, g, (x0 + x1) / 2, Y + FH / 2 + 0.05, (z0 + z1) / 2, ry);
    const n = Math.round(len / 2.5);
    for (let i = 0; i <= n; i++) b.cyl(post, 0.035, 0.035, FH, x0 + ((x1 - x0) * i) / n, Y, z0 + ((z1 - z0) * i) / n, 6);
    b.add(post, new THREE.BoxGeometry(len, 0.05, 0.05), (x0 + x1) / 2, Y + FH, (z0 + z1) / 2, ry);
  };
  fence(ct.x0 + 0.3, ct.z1 - 0.3, ct.x1 - 0.5, ct.z1 - 0.3); fence(ct.x0 + 0.3, 16, ct.x0 + 0.3, ct.z1 - 0.3);
  // mural wall along the east side
  const mural = painted('mural', 1024, 256, (g, w, h, R) => {
    g.fillStyle = '#f2d9a0'; g.fillRect(0, 0, w, h);
    const cols = ['#e2572b', '#2a6fe6', '#f0a81e', '#2f8f86', '#f4efe2', '#d6427a', '#1c2f7a'];
    for (let i = 0; i < 26; i++) { g.fillStyle = R.pick(cols); const x = R() * w, y = R() * h, r = R.range(30, 150); g.beginPath(); if (R() < 0.5) g.arc(x, h, r, Math.PI, 0); else { g.moveTo(x, h); g.lineTo(x + r * 0.7, h - r * 1.4); g.lineTo(x + r * 1.4, h); } g.fill(); }
    g.strokeStyle = '#1c2f7a'; g.lineWidth = 9; g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * 0.3 + Math.sin(x * 0.02) * 26); g.stroke();
    g.fillStyle = '#fff8e8'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(R() * w, R() * h * 0.5, R.range(6, 16), 0, 7); g.fill(); }
  });
  b.box(M('#e9dcc6'), 0.3, 3.2, 12, ct.x1 - 0.25, Y, 21.7);
  b.add(M('#ffffff', mural, 'mural'), new THREE.PlaneGeometry(11.6, 2.9), ct.x1 - 0.41, Y + 1.6, 21.7, -Math.PI / 2);
  b.box(M('#b9ad9a'), 0.4, 0.12, 12.2, ct.x1 - 0.25, Y + 3.2, 21.7);
  c.solids.push([ct.x1 - 0.4, 15.7, ct.x1 - 0.1, 27.7, 3.3]);
}
