/** Upper-storey bay tile and ground-floor strip textures. */
import * as THREE from 'three';
import { paintTex, toon } from '../../engine/look';
import { BAY, INK, PX, STOREY, hsl, outline, paintGlass, paintWall, paintWindow, type Rnd, type Style } from './paint';

type G = CanvasRenderingContext2D;
export const GF = 3.6;                   // ground-floor height (m)
const SPX = 256 / GF;                    // strip px per metre

/** 3 bays × 2 storeys, tiles in both directions. */
export function tileMat(st: Style, R: Rnd): THREE.Material {
  const W = 3 * BAY * PX, H = 2 * STOREY * PX;
  const t = paintTex(W, H, (g) => {
    paintWall(g, 0, 0, W, H, st, R);
    for (let r = 0; r < 2; r++) {
      const y0 = r * STOREY * PX;
      g.fillStyle = hsl(st.wall, 0, -0.03, -0.1); g.fillRect(0, y0 + STOREY * PX - 7, W, 7);       // string course shadow
      g.fillStyle = hsl(st.wall, 0, 0, 0.06); g.fillRect(0, y0 + STOREY * PX - 10, W, 3);
      for (let b = 0; b < 3; b++) {
        const cx = (b + 0.5) * BAY * PX, box = R() < 0.3, sh = st.win !== 'wide' && st.win !== 'grid';
        const win = (w: number, h: number, sill: number, o = {}) => paintWindow(g, cx - (w * PX) / 2, y0 + (STOREY - sill - h) * PX, w * PX, h * PX, st, R, { box, ...o });
        if (st.win === 'tall') win(1.05, 1.95, 0.55, { shutters: sh, mullX: 2, mullY: 3 });
        else if (st.win === 'arch') win(1.0, 1.7, 0.6, { arch: true, mullX: 2, mullY: 2 });
        else if (st.win === 'wide') win(2.0, 1.5, 0.85, { mullX: 3, mullY: 1 });
        else if (st.win === 'grid') win(1.8, 1.8, 0.7, { mullX: 3, mullY: 3 });
        else for (const s of [-1, 1]) paintWindow(g, cx + s * 0.55 * PX - 0.375 * PX, y0 + (STOREY - 0.8 - 1.55) * PX, 0.75 * PX, 1.55 * PX, st, R, { mullX: 1, mullY: 2, box: box && s < 0 });
        if (R() < 0.16) { const ax = cx + R.range(-20, 20), ay = y0 + STOREY * PX - 52; g.fillStyle = '#d9dcd6'; g.fillRect(ax, ay, 58, 36); outline(g, ax, ay, 58, 36, 1.8); g.strokeStyle = '#7d858c'; g.lineWidth = 1.5; g.beginPath(); g.arc(ax + 20, ay + 18, 12, 0, 7); g.stroke(); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(ax + 38, ay + 8 + i * 6); g.lineTo(ax + 53, ay + 8 + i * 6); g.stroke(); } }
        if (R() < 0.35) { g.fillStyle = hsl(st.wall, 0, -0.05, -0.12); g.globalAlpha = 0.25; const sx = cx + R.range(-70, 70); g.fillRect(sx, y0 + R.range(0, 200), R.range(3, 7), R.range(30, 70)); g.globalAlpha = 1; }
      }
    }
    const px = R.range(0.02, 0.1) * W; g.fillStyle = hsl(st.trim, 0, -0.1, -0.25); g.fillRect(px, 0, 7, H); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(px, -2, 7, H + 4);   // drainpipe
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return toon('#ffffff', { map: t });
}

export type ShopKind = 'shelves' | 'plants' | 'clothes' | 'cafe' | 'bakery' | 'washers' | 'home';
export interface Shop { x: number; w: number; kind: ShopKind; color: string }

function display(g: G, x: number, y: number, w: number, h: number, kind: ShopKind, R: Rnd) {
  const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#3a3550'); gr.addColorStop(1, '#6b5a5c'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#f2d79a'; g.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + w * (0.2 + i * 0.3), y + 12, 9, 0, 7); g.fill(); } g.globalAlpha = 1;   // pendant lamps
  const bright = ['#e8506a', '#f4c13a', '#4aa3df', '#5ac18e', '#f08b3c', '#ffffff', '#b07be0', '#f7e6c4'];
  if (kind === 'shelves' || kind === 'bakery') {
    const rows = 4, rh = (h - 26) / rows;
    for (let r = 0; r < rows; r++) {
      const sy = y + 24 + r * rh; g.fillStyle = '#8a6a4f'; g.fillRect(x, sy + rh - 5, w, 5);
      for (let cx = x + 4; cx < x + w - 6;) { const iw = kind === 'bakery' ? R.range(14, 24) : R.range(5, 13), ih = kind === 'bakery' ? R.range(9, 14) : R.range(rh * 0.45, rh * 0.8); g.fillStyle = kind === 'bakery' ? R.pick(['#d9a35b', '#c98a45', '#e8c27a', '#b9773a']) : R.pick(bright); if (kind === 'bakery') { g.beginPath(); g.ellipse(cx + iw / 2, sy + rh - 5 - ih / 2, iw / 2, ih / 2, 0, 0, 7); g.fill(); } else g.fillRect(cx, sy + rh - 5 - ih, iw, ih); cx += iw + R.range(1, 4); }
    }
  } else if (kind === 'plants') {
    for (let i = 0; i < 26; i++) { const px = x + R() * w, py = y + h * R.range(0.3, 1); g.fillStyle = R.pick(['#3f8a47', '#5aa24d', '#2f7440', '#79b85a']); for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(px + R.range(-10, 10), py + R.range(-12, 6), R.range(5, 12), R.range(3, 6), R() * 3, 0, 7); g.fill(); } if (R() < 0.5) { g.fillStyle = R.pick(bright); g.beginPath(); g.arc(px, py - 8, 4, 0, 7); g.fill(); } }
  } else if (kind === 'clothes') {
    for (let i = 0; i < Math.max(2, Math.floor(w / 50)); i++) { const px = x + (i + 0.5) * (w / Math.max(2, Math.floor(w / 50))), c = R.pick(bright); g.fillStyle = '#e9dccb'; g.beginPath(); g.arc(px, y + h * 0.25, 7, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.moveTo(px - 13, y + h * 0.33); g.lineTo(px + 13, y + h * 0.33); g.lineTo(px + 18, y + h * 0.8); g.lineTo(px - 18, y + h * 0.8); g.fill(); g.fillStyle = '#4b4458'; g.fillRect(px - 2, y + h * 0.8, 4, h * 0.2); }
  } else if (kind === 'cafe') {
    g.fillStyle = '#7a5a48'; g.fillRect(x, y + h * 0.62, w, h * 0.38); g.fillStyle = '#c9a27a'; g.fillRect(x, y + h * 0.6, w, 5);
    for (let i = 0; i < 4; i++) { g.fillStyle = R.pick(bright); g.fillRect(x + w * R.range(0.05, 0.9), y + h * 0.5, 8, 9); } g.fillStyle = '#2f2a3a'; g.fillRect(x + w * 0.1, y + h * 0.2, w * 0.35, h * 0.2); g.fillStyle = '#f3ead8'; for (let i = 0; i < 4; i++) g.fillRect(x + w * 0.13, y + h * 0.23 + i * 6, w * R.range(0.12, 0.28), 2);
  } else if (kind === 'washers') {
    for (let i = 0; i < Math.floor(w / 44); i++) { const px = x + 22 + i * 44; g.fillStyle = '#e6e8ea'; g.fillRect(px - 19, y + h * 0.4, 38, h * 0.6); g.fillStyle = '#35506e'; g.beginPath(); g.arc(px, y + h * 0.7, 12, 0, 7); g.fill(); g.strokeStyle = '#9aa3ad'; g.lineWidth = 3; g.stroke(); }
  }
  g.globalAlpha = 0.28; g.fillStyle = '#d6ecff'; g.beginPath(); const sx = x + w * R.range(0.05, 0.4); g.moveTo(sx, y + h); g.lineTo(sx + h * 0.6, y); g.lineTo(sx + h * 0.6 + w * 0.2, y); g.lineTo(sx + w * 0.2, y + h); g.fill();
  g.restore(); g.globalAlpha = 1;
}

/** Ground-floor strip for a facade `width` m wide; returns the material (u spans the full width). */
export function stripMat(width: number, st: Style, shops: Shop[], R: Rnd): THREE.Material {
  const W = Math.ceil(width * SPX), H = 256, m = (v: number) => v * SPX;
  const t = paintTex(W, H, (g) => {
    paintWall(g, 0, 0, W, H, { ...st, wall: hsl(st.wall, 0, -0.04, -0.07) }, R);
    g.fillStyle = hsl(st.wall, 0, -0.12, -0.26); g.fillRect(0, H - m(0.42), W, m(0.42)); g.fillStyle = INK; g.fillRect(0, H - m(0.42) - 1, W, 2);     // plinth
    for (const s of shops) {
      const x0 = m(s.x), w = m(s.w), top = m(0.78), bot = H - m(0.5);
      if (s.kind === 'home') {
        const dx = x0 + w * 0.5 - m(0.55); g.fillStyle = s.color; g.fillRect(dx, H - m(2.5), m(1.1), m(2.5)); outline(g, dx, H - m(2.5), m(1.1), m(2.5), 2.5); g.strokeStyle = hsl(s.color, 0, 0, -0.15); g.lineWidth = 2; g.strokeRect(dx + 9, H - m(2.3), m(1.1) - 18, m(0.9)); g.strokeRect(dx + 9, H - m(1.25), m(1.1) - 18, m(1.0)); g.fillStyle = '#e9c35a'; g.beginPath(); g.arc(dx + m(0.95), H - m(1.1), 3.5, 0, 7); g.fill();
        for (const sx of [0.14, 0.86]) if (w > m(3.4)) paintWindow(g, x0 + w * sx - m(0.5), H - m(2.45), m(1.0), m(1.45), st, R, { mullX: 2, mullY: 2, box: true });
        continue;
      }
      g.fillStyle = hsl(s.color, 0, 0, 0.02); g.fillRect(x0, 0, w, H - m(0.42)); outline(g, x0, -3, w, H - m(0.42) + 3, 3);                   // shop surround in its own colour
      const door = m(1.05), dx = x0 + (R() < 0.5 ? w * 0.5 - door / 2 : R() < 0.5 ? m(0.3) : w - door - m(0.3));
      for (const [a, b] of [[x0 + m(0.28), dx - m(0.16)], [dx + door + m(0.16), x0 + w - m(0.28)]]) if (b - a > m(0.5)) { display(g, a, top, b - a, bot - top, s.kind, R); g.strokeStyle = hsl(s.color, 0, 0, 0.3); g.lineWidth = 4; g.strokeRect(a, top, b - a, bot - top); outline(g, a - 2, top - 2, b - a + 4, bot - top + 4, 2); }
      paintGlass(g, dx, top, door, H - top - 3, R); g.strokeStyle = hsl(s.color, 0, 0, 0.3); g.lineWidth = 5; g.strokeRect(dx, top, door, H - top - 3); outline(g, dx - 2.5, top - 2.5, door + 5, H - top, 2); g.fillStyle = hsl(s.color, 0, 0, 0.3); g.fillRect(dx, top + m(0.42), door, 4); g.fillStyle = '#e9c35a'; g.fillRect(dx + door - 12, H - m(1.15), 4, m(0.3));
    }
  });
  t.wrapS = THREE.MirroredRepeatWrapping;
  return toon('#ffffff', { map: t });
}
