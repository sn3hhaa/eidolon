/** One building: core mass, painted faces, relief, roof. */
import * as THREE from 'three';
import { rng } from '../../engine/look';
import { Batch, frame, xform, shade, type Frame } from './kit';
import { BAY, STOREY, type Rnd, type Style } from './paint';
import { GF, stripMat, tileMat, type Shop, type ShopKind } from './paint2';
import { SHOP_NAMES, type SignAtlas } from './signs';
import { billboard, ivy, shopRelief, upperRelief } from './relief';

export type Side = 'N' | 'S' | 'E' | 'W';
export interface Lot { x0: number; z0: number; x1: number; z1: number }
export interface BOpts { floors: number; shop?: Side[]; plain?: Side[]; seed: number; roof?: 'flat' | 'gable'; names?: string[]; simple?: boolean; base?: number; ivy?: number; pool?: { st: Style; tile: THREE.Material } }

const WALLS = ['#f3e3c3', '#e39a6e', '#ee9a84', '#6bb8ae', '#e9bf5a', '#b1c9a0', '#a9cfe6', '#f0b9b2', '#f6f0e4', '#c0604a', '#dcae68', '#bdaedb', '#5f88c2', '#f2cf9a', '#d77f72', '#8fc3bd'];
const SHUTTERS = ['#2f7f7a', '#4c8a57', '#3f6fae', '#b84a3f', '#7a5236', '#f3ead8', '#2b4c6f', '#8a5aa0'];
const SHOPCOL = ['#c24a44', '#2f7a9f', '#3f8a60', '#d9982c', '#7654a0', '#d9603a', '#34609a', '#1f8a84', '#c2478a', '#5a6680', '#a8483a', '#3b9a94'];
let nameIx = 0;

export function pickStyle(R: Rnd): Style {
  const wall = R.pick(WALLS), brick = wall === '#c0604a';
  return { wall, trim: R() < 0.75 ? '#fff4e2' : shade(wall, -0.28), shutter: R.pick(SHUTTERS), accent: R.pick(SHOPCOL), wallKind: brick ? 'brick' : R.pick(['plaster', 'plaster', 'stucco', 'tile', 'board', 'plaster']), win: R.pick(['tall', 'tall', 'pair', 'wide', 'arch', 'grid']) };
}

export function faceFrame(l: Lot, s: Side): [Frame, number] {
  const V = THREE.Vector3;
  if (s === 'S') return [frame(new V(l.x0, 0, l.z1), new V(1, 0, 0), new V(0, 0, 1)), l.x1 - l.x0];
  if (s === 'N') return [frame(new V(l.x1, 0, l.z0), new V(-1, 0, 0), new V(0, 0, -1)), l.x1 - l.x0];
  if (s === 'E') return [frame(new V(l.x1, 0, l.z1), new V(0, 0, -1), new V(1, 0, 0)), l.z1 - l.z0];
  return [frame(new V(l.x0, 0, l.z0), new V(0, 0, 1), new V(-1, 0, 0)), l.z1 - l.z0];
}

function layoutShops(w: number, R: Rnd, names?: string[]): (Shop & { name: string })[] {
  const n = Math.max(1, Math.round(w / R.range(4.6, 6.6))), uw = w / n, out: (Shop & { name: string })[] = [];
  for (let i = 0; i < n; i++) {
    const home = !names && R() < 0.12, pick = names?.[i] ? (SHOP_NAMES.find((s) => s[0] === names[i]) ?? [names[i], 'cafe']) : SHOP_NAMES[nameIx++ % 48];
    out.push({ x: i * uw + 0.2, w: uw - 0.4, kind: home ? 'home' : (pick[1] as ShopKind), color: R.pick(SHOPCOL), name: home ? '' : pick[0] });
  }
  return out;
}

export function building(B: Batch, signs: SignAtlas, lot: Lot, o: BOpts, solids: number[][]) {
  const R = rng(o.seed), st = o.pool?.st ?? pickStyle(R), ins = 0.3, base = o.base ?? 0, lift = new THREE.Matrix4().makeTranslation(0, base, 0);
  const l: Lot = { x0: lot.x0 + ins, z0: lot.z0 + ins, x1: lot.x1 - ins, z1: lot.z1 - ins };
  const w = l.x1 - l.x0, d = l.z1 - l.z0, H = GF + (o.floors - 1) * STOREY, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
  B.add(new THREE.BoxGeometry(w - 0.06, H + base, d - 0.06), xform(cx, (H + base) / 2, cz), shade(st.wall, -0.06));
  solids.push([lot.x0, lot.z0, lot.x1, lot.z1, H + base]);
  const tile = o.pool?.tile ?? tileMat(st, R);
  const face = (s: Side, shop: boolean) => {
    const [F, fw] = faceFrame(l, s); F.premultiply(lift); const nb = Math.max(1, Math.round(fw / BAY));
    if (shop) {
      const shops = layoutShops(fw, R, s === (o.shop ?? [])[0] ? o.names : undefined);
      B.quad(F, 0, 0, 0.03, fw, GF, stripMat(fw, st, shops, R));
      shopRelief(B, F, fw, shops, st, R, signs);
    } else { B.quad(F, 0, 0, 0.03, fw, GF, tile, 0, 0, nb / 3, GF / (2 * STOREY)); if (o.ivy && R() < o.ivy) ivy(B, F, fw, H, R); }
    if (o.floors > 1) { B.quad(F, 0, GF, 0.03, fw, H - GF, tile, 0, 0, nb / 3, (o.floors - 1) / 2); upperRelief(B, F, fw, nb, o.floors, st, R, !o.simple && (shop || R() < 0.5)); }
  };
  for (const s of o.shop ?? []) face(s, true);
  for (const s of o.plain ?? []) face(s, false);
  const kind = o.roof ?? (o.floors <= 3 && R() < 0.3 ? 'gable' : 'flat');
  if (kind === 'flat' && !o.simple && o.floors >= 3 && o.shop?.length && R() < 0.24) { const [F, fw] = faceFrame(l, o.shop[0]); F.premultiply(new THREE.Matrix4().makeTranslation(0, H + base, 0)); if (fw > 7) billboard(B, F, fw, R, signs); }
  roof(B, l, H + base, st, R, kind);
}

function prism(w: number, h: number, d: number) {       // ridge along x
  const a = [-w / 2, 0, d / 2], b = [w / 2, 0, d / 2], c = [w / 2, 0, -d / 2], e = [-w / 2, 0, -d / 2], r0 = [-w / 2, h, 0], r1 = [w / 2, h, 0];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([a, b, r1, a, r1, r0, c, e, r0, c, r0, r1, e, a, r0, b, c, r1].flat(), 3)); g.computeVertexNormals(); return g;
}

function roof(B: Batch, l: Lot, H: number, st: Style, R: Rnd, kind: 'flat' | 'gable') {
  const w = l.x1 - l.x0, d = l.z1 - l.z0, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, F = xform(cx, H, cz), trim = shade(st.wall, -0.14);
  B.box(F, 0, 0.1, 0, w + 0.7, 0.28, d + 0.7, st.trim);                                                    // top cornice
  if (kind === 'gable') {
    const alongX = w >= d, rw = (alongX ? w : d) + 0.9, rd = (alongX ? d : w) + 0.9, rh = Math.min(3.4, rd * 0.32), tilec = R.pick(['#c9603f', '#b5533a', '#d0704a', '#7f8fa3']);
    const M = xform(cx, H + 0.24, cz, 0, alongX ? 0 : Math.PI / 2, 0);
    B.add(prism(rw, rh, rd), M, tilec);
    const sl = Math.atan2(rh, rd / 2), len = Math.hypot(rh, rd / 2);
    for (const s of [-1, 1]) for (let k = 1; k < len / 0.55; k++) { const t = (k * 0.55) / len; B.box(M, 0, rh * (1 - t) + 0.03, s * (rd / 2) * t, rw, 0.05, 0.09, shade(tilec, -0.09), -s * sl, 0, 0); }
    B.box(M, 0, rh + 0.04, 0, rw + 0.1, 0.14, 0.24, shade(tilec, -0.14));
    B.add(new THREE.BoxGeometry(0.7, 1.5, 0.7), new THREE.Matrix4().multiplyMatrices(M, xform(rw * R.range(-0.3, 0.3), rh * 0.55 + 0.5, rd * 0.18)), shade(st.wall, -0.1));
    return;
  }
  for (const [px, pz, pw, pd] of [[0, d / 2 - 0.12, w, 0.24], [0, -d / 2 + 0.12, w, 0.24], [w / 2 - 0.12, 0, 0.24, d], [-w / 2 + 0.12, 0, 0.24, d]]) B.box(F, px, 0.55, pz, pw, 0.66, pd, trim);
  B.box(F, 0, 0.22, 0, w - 0.3, 0.06, d - 0.3, '#b7aea3');
  const n = R.int(2, 5);
  for (let i = 0; i < n; i++) {
    const px = R.range(-w / 2 + 1.6, w / 2 - 1.6), pz = R.range(-d / 2 + 1.6, d / 2 - 1.6), k = R();
    if (k < 0.3) { B.add(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 12), new THREE.Matrix4().multiplyMatrices(F, xform(px, 1.9, pz)), R.pick(['#8c6a4a', '#c9cdd2', '#3f6f9f'])); B.add(new THREE.ConeGeometry(0.95, 0.4, 12), new THREE.Matrix4().multiplyMatrices(F, xform(px, 2.85, pz)), '#6f5a4a'); for (const [a, b] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) B.box(F, px + a, 0.7, pz + b, 0.1, 0.95, 0.1, '#5b5560'); }
    else if (k < 0.55) { B.box(F, px, 0.72, pz, 1.25, 0.85, 0.8, '#d5d8d6'); B.box(F, px, 0.72, pz + 0.41, 0.9, 0.55, 0.03, '#7c858d'); }
    else if (k < 0.75) { B.box(F, px, 1.4, pz, 2.4, 2.2, 2.0, shade(st.wall, -0.03)); B.box(F, px, 2.56, pz, 2.7, 0.12, 2.3, trim); B.box(F, px - 0.4, 1.15, pz + 1.01, 0.85, 1.7, 0.04, st.shutter); }
    else if (k < 0.88) { for (let j = 0; j < 3; j++) B.box(F, px + j * 1.15 - 1.15, 0.75, pz, 1.05, 0.05, 1.7, '#2a4a7c', -0.45, 0, 0); }
    else { B.box(F, px, 2.0, pz, 0.05, 3.4, 0.05, '#4a4652'); B.box(F, px, 3.2, pz, 1.2, 0.04, 0.04, '#4a4652'); B.box(F, px, 2.8, pz, 0.8, 0.04, 0.04, '#4a4652'); }
  }
}
