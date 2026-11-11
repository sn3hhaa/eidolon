/** Painted ground textures (canvas). UVs are in metres / tile size, so every texture repeats. */
import * as THREE from 'three';
import { paintTex, rng } from '../../engine/look';

const hex = (c: THREE.Color) => `#${c.getHexString()}`;
const cache = new Map<string, THREE.Texture>();
const memo = (k: string, f: () => THREE.Texture) => cache.get(k) ?? cache.set(k, f()).get(k)!;

/** Rectangular pavers with joints; `nx × ny` pavers per tile, optional running-bond offset. */
export function pavers(base: string, joint: string, nx: number, ny: number, seed = 1, vary = 0.05, bond = false, size = 512) {
  return memo(`pav|${base}|${joint}|${nx}|${ny}|${seed}|${vary}|${bond}`, () => paintTex(size, size, (g, w, h) => {
    const R = rng(seed), col = new THREE.Color(base);
    g.fillStyle = joint; g.fillRect(0, 0, w, h);
    const pw = w / nx, ph = h / ny, j = Math.max(1.5, w / 256);
    for (let iy = 0; iy < ny; iy++) for (let ix = -1; ix < nx; ix++) {
      const c = col.clone().offsetHSL(R.range(-0.01, 0.01), R.range(-0.03, 0.03), R.range(-vary, vary));
      g.fillStyle = hex(c);
      const ox = bond && iy % 2 ? pw / 2 : 0;
      g.fillRect(ix * pw + ox + j / 2, iy * ph + j / 2, pw - j, ph - j);
      if (R() < 0.35) { g.fillStyle = hex(c.clone().offsetHSL(0, 0, R.range(-0.05, 0.05))); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(ix * pw + ox + pw * R(), iy * ph + ph * R(), pw * 0.3, ph * 0.2, R() * 3, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
  }, [1, 1]));
}

/** Asphalt: mid warm grey with painterly blotches, aggregate specks, a few tar seams. */
export function asphalt(base = '#84808a', seed = 3) {
  return memo(`asph|${base}|${seed}`, () => paintTex(1024, 1024, (g, w, h) => {
    const R = rng(seed), col = new THREE.Color(base);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = hex(col.clone().offsetHSL(R.range(-0.02, 0.02), R.range(-0.03, 0.03), R.range(-0.06, 0.06))); g.globalAlpha = R.range(0.15, 0.45);
      const x = R() * w, y = R() * h, rw = R.range(30, 170), rh = rw * R.range(0.25, 0.7);
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { g.beginPath(); g.ellipse(x + ox, y + oy, rw, rh, R.range(-0.3, 0.3), 0, 7); g.fill(); }
    }
    for (let i = 0; i < 2600; i++) { g.globalAlpha = R.range(0.12, 0.4); g.fillStyle = R() < 0.5 ? '#b9b4ba' : '#5a5560'; g.fillRect(R() * w, R() * h, R.range(1, 3), R.range(1, 2.4)); }
    g.globalAlpha = 0.35; g.strokeStyle = '#4c4854'; g.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) { g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += R.range(20, 70); y += R.range(-28, 28); g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1;
  }, [1, 1]));
}

/** Smooth concrete with form-work panel joints. */
export function concrete(base = '#cfc8bd', seed = 5, panels = 2) {
  return memo(`conc|${base}|${seed}|${panels}`, () => paintTex(512, 512, (g, w, h) => {
    const R = rng(seed), col = new THREE.Color(base);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { g.fillStyle = hex(col.clone().offsetHSL(R.range(-0.01, 0.01), 0, R.range(-0.05, 0.05))); g.globalAlpha = R.range(0.15, 0.4); const x = R() * w, y = R() * h, r = R.range(20, 110); for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { g.beginPath(); g.ellipse(x + ox, y + oy, r, r * R.range(0.3, 0.9), R() * 3, 0, 7); g.fill(); } }
    g.globalAlpha = 0.5; g.fillStyle = hex(col.clone().offsetHSL(0, 0, -0.16));
    for (let i = 0; i < panels; i++) { g.fillRect((i * w) / panels, 0, 2, h); g.fillRect(0, (i * h) / panels, w, 2); }
    g.globalAlpha = 1;
  }, [1, 1]));
}

/** Any one-off painted texture (non-repeating unless `repeat`). */
export function painted(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number, R: ReturnType<typeof rng>) => void, repeat = false) {
  return memo('p|' + key, () => paintTex(w, h, (g, ww, hh) => draw(g, ww, hh, rng(key.length * 7919 + key.charCodeAt(0))), repeat ? [1, 1] : undefined));
}
