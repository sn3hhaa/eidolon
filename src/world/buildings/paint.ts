/** Painted facade textures: upper-storey bay tiles (3 bays × 2 storeys, 80 px/m). */
import * as THREE from 'three';
import { paintTex, rng } from '../../engine/look';

export type Rnd = ReturnType<typeof rng>;
type G = CanvasRenderingContext2D;
export const INK = '#2b2233';
export const PX = 80;                    // pixels per metre
export const BAY = 3.2, STOREY = 3.2;    // metres

export interface Style {
  wall: string; trim: string; shutter: string; accent: string;
  wallKind: 'plaster' | 'brick' | 'stucco' | 'tile' | 'board';
  win: 'tall' | 'pair' | 'wide' | 'arch' | 'grid';
}
export const hsl = (c: string, dh: number, ds: number, dl: number) => '#' + new THREE.Color(c).offsetHSL(dh, ds, dl).getHexString();

export function paintWall(g: G, x: number, y: number, w: number, h: number, st: Style, R: Rnd) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = st.wall; g.fillRect(x, y, w, h);
  const dab = (n: number, vary: number, sz: [number, number], streak = false) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = hsl(st.wall, R.range(-0.01, 0.01), R.range(-0.04, 0.04), R.range(-vary, vary)); g.globalAlpha = R.range(0.15, 0.45);
      const rw = R.range(sz[0], sz[1]); g.beginPath(); g.ellipse(x + R() * w, y + R() * h, rw, streak ? rw * 0.25 : rw * R.range(0.5, 1), streak ? 0 : R() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  };
  if (st.wallKind === 'brick') {
    const bh = 10, bw = 26; g.strokeStyle = hsl(st.wall, 0, -0.05, 0.1); g.lineWidth = 1.5;
    for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) {
      const bx = x + c * bw + (r % 2) * bw / 2, by = y + r * bh;
      g.fillStyle = hsl(st.wall, R.range(-0.012, 0.012), R.range(-0.06, 0.04), R.range(-0.07, 0.05)); g.fillRect(bx, by, bw, bh); g.strokeRect(bx, by, bw, bh);
    }
  } else if (st.wallKind === 'tile') {
    const ts = 16; for (let r = 0; r * ts < h; r++) for (let c = 0; c * ts < w; c++) { g.fillStyle = hsl(st.wall, 0, R.range(-0.04, 0.04), R.range(-0.045, 0.045)); g.fillRect(x + c * ts + 1, y + r * ts + 1, ts - 1.5, ts - 1.5); }
  } else if (st.wallKind === 'board') {
    dab(30, 0.03, [20, 60], true);
    g.strokeStyle = hsl(st.wall, 0, -0.05, -0.13); g.lineWidth = 1.6; for (let r = 0; r * 14 < h; r++) { g.beginPath(); g.moveTo(x, y + r * 14); g.lineTo(x + w, y + r * 14); g.stroke(); }
  } else {
    dab(st.wallKind === 'stucco' ? 90 : 40, st.wallKind === 'stucco' ? 0.05 : 0.035, [14, 70]);
    if (st.wallKind === 'stucco') { g.fillStyle = hsl(st.wall, 0, 0, -0.1); for (let i = 0; i < 500; i++) { g.globalAlpha = R.range(0.1, 0.3); g.fillRect(x + R() * w, y + R() * h, 2, 1.5); } g.globalAlpha = 1; }
  }
  g.restore();
}

/** Glass with interior hint, curtains and a sky-reflection streak. */
export function paintGlass(g: G, x: number, y: number, w: number, h: number, R: Rnd, lit = false) {
  const gr = g.createLinearGradient(x, y, x, y + h);
  if (lit) { gr.addColorStop(0, '#f6d58a'); gr.addColorStop(1, '#d99b55'); } else { gr.addColorStop(0, '#2d4f7c'); gr.addColorStop(0.6, '#3d6f96'); gr.addColorStop(1, '#27405f'); }
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const k = R();
  if (k < 0.45) { g.fillStyle = R.pick(['#f3ead8', '#e9d9e6', '#d8e6ea', '#f1e3b8']); g.globalAlpha = 0.85; const cw = w * R.range(0.18, 0.34); g.beginPath(); g.moveTo(x, y); g.lineTo(x + cw, y); g.quadraticCurveTo(x + cw * 0.7, y + h * 0.6, x + cw * 0.2, y + h); g.lineTo(x, y + h); g.fill(); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w - cw, y); g.quadraticCurveTo(x + w - cw * 0.7, y + h * 0.6, x + w - cw * 0.2, y + h); g.lineTo(x + w, y + h); g.fill(); }
  else if (k < 0.62) { g.fillStyle = '#e8e2d2'; g.globalAlpha = 0.8; const bh = h * R.range(0.25, 0.7); g.fillRect(x, y, w, bh); g.strokeStyle = '#b9b09a'; g.lineWidth = 1; for (let i = 4; i < bh; i += 5) { g.beginPath(); g.moveTo(x, y + i); g.lineTo(x + w, y + i); g.stroke(); } }
  else if (k < 0.75) { g.fillStyle = '#3f7d4c'; g.globalAlpha = 0.9; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(x + w * R.range(0.2, 0.8), y + h * R.range(0.72, 0.95), w * 0.16, h * 0.1, R() * 3, 0, 7); g.fill(); } }
  g.globalAlpha = 0.33; g.fillStyle = '#cfe9ff'; g.beginPath(); const sx = x + w * R.range(0.1, 0.5); g.moveTo(sx, y + h); g.lineTo(sx + w * 0.5, y); g.lineTo(sx + w * 0.72, y); g.lineTo(sx + w * 0.22, y + h); g.fill();
  g.restore(); g.globalAlpha = 1;
}

export function outline(g: G, x: number, y: number, w: number, h: number, lw = 2, col = INK) { g.strokeStyle = col; g.lineWidth = lw; g.strokeRect(x, y, w, h); }

/** One window (frame, panes, optional shutters / flower box). (x,y) top-left of the opening in px. */
export function paintWindow(g: G, x: number, y: number, w: number, h: number, st: Style, R: Rnd, o: { shutters?: boolean; box?: boolean; arch?: boolean; mullX?: number; mullY?: number } = {}) {
  const f = 5;
  if (o.shutters) for (const s of [-1, 1]) {
    const open = R() < 0.8, sw = open ? w * 0.48 : w * 0.5, sx = s < 0 ? (open ? x - sw - 1 : x) : (open ? x + w + 1 : x + w - sw);
    g.fillStyle = st.shutter; g.fillRect(sx, y, sw, h); g.strokeStyle = hsl(st.shutter, 0, 0, -0.13); g.lineWidth = 1.3;
    for (let i = 5; i < h - 2; i += 5) { g.beginPath(); g.moveTo(sx + 3, y + i); g.lineTo(sx + sw - 3, y + i); g.stroke(); }
    outline(g, sx, y, sw, h, 1.8);
  }
  g.fillStyle = st.trim; g.fillRect(x - f, y - f, w + 2 * f, h + 2 * f);
  if (o.arch) { g.beginPath(); g.ellipse(x + w / 2, y - f + 1, w / 2 + f, w * 0.32, 0, Math.PI, 0); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); }
  outline(g, x - f, y - f, w + 2 * f, h + 2 * f, 2);
  paintGlass(g, x, y, w, h, R, R() < 0.06);
  g.strokeStyle = st.trim; g.lineWidth = 3.5;
  const mx = o.mullX ?? 2, my = o.mullY ?? 2;
  for (let i = 1; i < mx; i++) { g.beginPath(); g.moveTo(x + (w * i) / mx, y); g.lineTo(x + (w * i) / mx, y + h); g.stroke(); }
  for (let i = 1; i < my; i++) { g.beginPath(); g.moveTo(x, y + (h * i) / my); g.lineTo(x + w, y + (h * i) / my); g.stroke(); }
  outline(g, x, y, w, h, 1.6);
  g.fillStyle = hsl(st.trim, 0, 0, -0.2); g.globalAlpha = 0.5; g.fillRect(x, y, w, 4); g.globalAlpha = 1;       // lintel shadow
  if (o.box) {
    g.fillStyle = hsl(st.accent, 0, -0.1, -0.12); g.fillRect(x - 4, y + h + 2, w + 8, 9); outline(g, x - 4, y + h + 2, w + 8, 9, 1.5);
    for (let i = 0; i < 14; i++) { g.fillStyle = R() < 0.6 ? R.pick(['#3f8a47', '#5aa24d', '#2f7440']) : R.pick(['#e8506a', '#f4c13a', '#f08bb0', '#ffffff']); g.beginPath(); g.arc(x - 2 + R() * (w + 4), y + h + R.range(-5, 3), R.range(2.5, 5), 0, 7); g.fill(); }
  }
}

export { paintTex };
