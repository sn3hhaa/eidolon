/** Real 3D relief on the painted faces: pilasters, fascias + signs, awnings, blade signs, sills, balconies. */
import * as THREE from 'three';
import { Batch, shade, xform, type Frame } from './kit';
import { STOREY, type Rnd, type Style } from './paint';
import { GF, type Shop } from './paint2';
import type { SignAtlas } from './signs';

const AWN = [['#d9483b', '#fff4e2'], ['#2f7f9f', '#fff4e2'], ['#3f8f5a', '#fff4e2'], ['#e9a82c', '#fff4e2'], ['#27476e', '#e9c35a'], ['#c2478a', '#fff4e2'], ['#e06a3a', '#f6e2b8'], ['#4a5262', '#e8e2d2']];
const IRON = '#3a3642';
const mul = (F: Frame, m: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(F, m);

export function shopRelief(B: Batch, F: Frame, fw: number, shops: (Shop & { name: string })[], st: Style, R: Rnd, signs: SignAtlas) {
  const uw = fw / shops.length, pil = shade(st.trim, -0.03);
  for (let i = 0; i <= shops.length; i++) {
    const px = Math.min(fw - 0.2, Math.max(0.2, i * uw));
    B.box(F, px, GF / 2, 0.12, 0.4, GF, 0.2, pil); B.box(F, px, 0.24, 0.15, 0.5, 0.48, 0.26, shade(pil, -0.16)); B.box(F, px, GF - 0.9, 0.15, 0.5, 0.14, 0.26, shade(pil, -0.08));
    if (R() < 0.45) { B.box(F, px, 2.42, 0.3, 0.15, 0.24, 0.15, '#f8e9b4'); B.box(F, px, 2.57, 0.3, 0.2, 0.06, 0.2, IRON); B.box(F, px, 2.5, 0.2, 0.04, 0.04, 0.2, IRON); }
  }
  B.box(F, fw / 2, GF + 0.1, 0.17, fw + 0.12, 0.24, 0.36, st.trim);
  B.box(F, fw / 2, GF + 0.25, 0.12, fw + 0.06, 0.08, 0.26, shade(st.trim, -0.1));
  for (const s of shops) {
    const cx = s.x + s.w / 2;
    if (s.kind === 'home') { B.box(F, cx, 2.72, 0.32, 1.6, 0.08, 0.62, shade(st.trim, -0.12)); B.box(F, cx, 0.1, 0.2, 1.4, 0.2, 0.36, '#b9b0a4'); continue; }
    const fc = shade(s.color, -0.04);
    B.box(F, cx, GF - 0.42, 0.11, s.w - 0.1, 0.62, 0.16, fc);
    const awn = R() < 0.6;
    if (!awn) { const sw = Math.min(s.w - 0.6, 3.1), uv = signs.slot(s.name, fc, R() < 0.8 ? '#fff1d2' : '#f4c13a', R); B.quad(F, cx - sw / 2, GF - 0.68, 0.2, sw, 0.52, signs.mat, ...uv); }
    if (awn) {                                             // striped awning with valance
      const [c1, c2] = R.pick(AWN), a0 = s.x + 0.12, aw = s.w - 0.24, n = Math.max(4, Math.round(aw / 0.42)), sw2 = aw / n, dep = R.range(1.25, 1.45), y0 = 3.44, y1 = 2.86, ang = Math.atan2(y0 - y1, dep), len = Math.hypot(dep, y0 - y1);
      for (let k = 0; k < n; k++) { const c = k % 2 ? c2 : c1, x = a0 + (k + 0.5) * sw2; B.box(F, x, (y0 + y1) / 2, 0.2 + dep / 2, sw2, 0.035, len, c, ang, 0, 0); }
      B.box(F, a0 + aw / 2, y1 - 0.16, 0.2 + dep, aw, 0.34, 0.04, c1);
      const vw = Math.min(aw - 0.3, 2.0), vuv = signs.slot(s.name, c1, c2, R); B.quad(F, cx - vw / 2, y1 - 0.315, 0.2 + dep + 0.025, vw, 0.31, signs.mat, ...vuv);
      for (const e of [a0, a0 + aw]) B.box(F, e, (y0 + y1) / 2 - 0.02, 0.2 + dep / 2, 0.03, 0.03, len, IRON, ang, 0, 0);
    }
    if (R() < 0.4) {                                              // blade sign
      const px = s.x - 0.2 + (R() < 0.5 ? 0.45 : s.w - 0.05), c = R.pick(['#fff1d2', '#f4c13a', s.color]);
      B.box(F, px, 3.47, 0.55, 0.04, 0.04, 0.9, IRON); B.box(F, px, 3.14, 0.66, 0.07, 0.56, 0.6, shade(s.color, -0.05)); B.box(F, px, 3.14, 0.66, 0.09, 0.36, 0.4, c);
    }
    if (R() < 0.5) for (const e of [s.x + 0.25, s.x + s.w - 0.25]) if (R() < 0.7) {    // potted plants hugging the wall
      B.add(new THREE.CylinderGeometry(0.17, 0.13, 0.34, 10), mul(F, xform(e, 0.32, 0.26)), R.pick(['#c9704a', '#e8e2d2', '#4a6f8f']));
      B.add(new THREE.IcosahedronGeometry(0.27, 1), mul(F, xform(e, 0.72, 0.26, 0, R() * 3, 0, 1, R.range(1, 1.5), 0.8)), R.pick(['#3f8a47', '#5aa24d', '#2f7440']));
    }
  }
}

const SILL: Record<Style['win'], [number, number]> = { tall: [1.05, 0.55], arch: [1.0, 0.6], wide: [2.0, 0.85], grid: [1.8, 0.7], pair: [1.9, 0.8] };

export function upperRelief(B: Batch, F: Frame, fw: number, nb: number, floors: number, st: Style, R: Rnd, detail: boolean) {
  const bw = fw / nb, [ww, sill] = SILL[st.win], rail = R() < 0.5 ? IRON : st.shutter, H = GF + (floors - 1) * STOREY;
  if (R() < 0.6) for (const e of [0.19, fw - 0.19]) B.box(F, e, (GF + H) / 2, 0.06, 0.38, H - GF, 0.08, st.trim);
  for (let j = 1; j < floors; j++) {
    const y0 = GF + (j - 1) * STOREY;
    if (j > 1) B.box(F, fw / 2, y0, 0.06, fw, 0.1, 0.1, shade(st.wall, 0.05));
    for (let b = 0; b < nb; b++) {
      const cx = (b + 0.5) * bw, w = ww * (bw / 3.2);
      if (detail && (st.win === 'tall' || st.win === 'arch') && R() < 0.34) {
        const bwid = w + 0.9, by = y0 + sill - 0.1;
        B.box(F, cx, by, 0.4, bwid, 0.1, 0.74, shade(st.trim, -0.06)); B.box(F, cx, by - 0.12, 0.3, bwid - 0.5, 0.14, 0.4, shade(st.trim, -0.16));
        B.box(F, cx, by + 0.95, 0.74, bwid, 0.05, 0.05, rail); for (const e of [-1, 1]) B.box(F, cx + e * (bwid / 2 - 0.025), by + 0.95, 0.4, 0.05, 0.05, 0.7, rail);
        const nbal = Math.round(bwid / 0.16); for (let k = 0; k <= nbal; k++) B.box(F, cx - bwid / 2 + (k * bwid) / nbal, by + 0.5, 0.74, 0.03, 0.9, 0.03, rail);
        for (const e of [-1, 1]) for (let k = 1; k < 4; k++) B.box(F, cx + e * (bwid / 2 - 0.025), by + 0.5, 0.74 - k * 0.17, 0.03, 0.9, 0.03, rail);
        if (R() < 0.7) for (let k = 0; k < 3; k++) { const px = cx + R.range(-bwid / 2 + 0.25, bwid / 2 - 0.25); B.add(new THREE.CylinderGeometry(0.11, 0.09, 0.2, 8), mul(F, xform(px, by + 0.15, 0.58)), '#c9704a'); B.add(new THREE.IcosahedronGeometry(0.2, 1), mul(F, xform(px, by + 0.42, 0.58, 0, R() * 3, 0, 1, R.range(0.9, 1.6), 1)), R.pick(['#3f8a47', '#5aa24d', '#e8506a', '#f4c13a'])); }
      } else {
        B.box(F, cx, y0 + sill - 0.05, 0.1, w + 0.34, 0.08, 0.2, st.trim);
        if (detail && st.win === 'wide' && R() < 0.3) { const c = R.pick(AWN)[0]; B.box(F, cx, y0 + sill + 1.62, 0.36, w + 0.2, 0.03, 0.72, c, 0.5, 0, 0); }
        else if (detail && R() < 0.5) B.box(F, cx, y0 + sill + (st.win === 'tall' ? 2.06 : st.win === 'grid' ? 1.9 : 1.66), 0.08, w + 0.3, 0.1, 0.16, st.trim);     // lintel hood
      }
    }
  }
}

/** Ivy climbing a plain wall between the window bays: dense overlapping leaf clumps, dark underlayer + lighter top leaves. */
export function ivy(B: Batch, F: Frame, fw: number, H: number, R: Rnd) {
  const nb = Math.max(1, Math.round(fw / 3.2)), bw = fw / nb, cols = R.int(1, Math.min(3, nb));
  for (let c = 0; c < cols; c++) {
    const x0 = Math.min(fw - 0.5, Math.max(0.5, R.int(0, nb) * bw)), top = Math.min(H - 0.4, R.range(5, 11));
    for (let i = 0; i < 90; i++) {
      const t = Math.pow(R(), 0.8), y = 0.15 + t * top, half = 0.28 + 0.5 * Math.sin(Math.min(1, t * 1.15) * Math.PI) + (t < 0.12 ? 0.7 : 0), under = i < 30;
      const x = THREE.MathUtils.clamp(x0 + R.range(-half, half), 0.15, fw - 0.15), sc = under ? R.range(0.4, 0.62) : R.range(0.16, 0.34);
      B.add(new THREE.IcosahedronGeometry(1, under ? 1 : 0), mul(F, xform(x, y, under ? 0.05 : 0.1, 0, 0, R() * 3, sc, sc * R.range(0.7, 1), under ? 0.05 : 0.07)), under ? R.pick(['#28663c', '#2f7440']) : R.pick(['#3f8a47', '#4f9a4a', '#6aa84f', '#3a8050']), false);
    }
  }
}

const BILL = ['HELLO HARBOR', 'KOMOREBI TEA', 'GO GO GELATO', 'RIDE THE 9 LINE', 'RADIO SUNNY 88', 'TIDE & TONIC', 'SUMMER FEST', 'OPEN SKY HOTEL'];
/** Rooftop billboard set back behind the parapet; F origin at roof level on the street face. */
export function billboard(B: Batch, F: Frame, fw: number, R: Rnd, signs: SignAtlas) {
  const w = Math.min(fw - 1.6, R.range(4.2, 6.2)), h = w * 0.27, cx = fw / 2 + R.range(-0.8, 0.8), [c1, c2] = R.pick(AWN), z = -0.9;
  B.box(F, cx, 1.5 + h / 2, z, w + 0.3, h + 0.3, 0.14, IRON);
  B.quad(F, cx - w / 2, 1.5, z + 0.08, w, h, signs.mat, ...signs.slot(R.pick(BILL), c1, c2, R));
  for (const e of [-1, 1]) { B.box(F, cx + e * w * 0.36, 0.75, z, 0.1, 1.5, 0.1, IRON); B.box(F, cx + e * w * 0.36, 1.1, z - 0.7, 0.07, 0.07, 2.2, IRON, -0.75, 0, 0); }
}
