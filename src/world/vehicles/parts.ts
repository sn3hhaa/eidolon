/** Shared vehicle parts: material palette, geometry collector, wheels, number plates. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, paintTex, rng } from '../../engine/look';

const cache = new Map<string, THREE.Material>();
const memo = <T extends THREE.Material>(k: string, f: () => T): T => { let m = cache.get(k) as T | undefined; if (!m) { m = f(); m.name = k; cache.set(k, m); } return m; };

export const M = {
  tire: () => memo('tire', () => toon('#2a2830')),
  dark: () => memo('dark', () => toon('#2d2e38')),
  chrome: () => memo('chrome', () => toon('#dfe5ee')),
  interior: () => memo('interior', () => toon('#3b3542')),
  seat: () => memo('seat', () => toon('#8a7462')),
  skin: () => memo('skin', () => toon('#4a3f4a')),
  lamp: () => memo('lamp', () => toon('#fff7dc', { emissive: '#fff1c0', emissiveIntensity: 0.35 })),
  glass: () => memo('glass', () => {
    const map = paintTex(256, 128, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#9cc4e6'); grd.addColorStop(0.45, '#4a7096'); grd.addColorStop(1, '#22344e');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(235,246,255,0.55)';                                   // sky-reflection streaks
      for (const [x, ww] of [[30, 26], [70, 8], [150, 34], [200, 6]]) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + ww, h); g.lineTo(x + ww + 46, 0); g.lineTo(x + 46, 0); g.fill(); }
    });
    return toon('#ffffff', { map, transparent: true, opacity: 0.86, depthWrite: true });
  }),
  hub: (style: number) => memo('hub' + style, () => toon('#ffffff', { map: paintTex(128, 128, (g, w) => {
    const c = w / 2; g.fillStyle = '#2a2830'; g.fillRect(0, 0, w, w);
    g.fillStyle = style === 2 ? '#f3efe6' : '#d5dbe4'; g.beginPath(); g.arc(c, c, c * 0.93, 0, 7); g.fill();
    g.fillStyle = '#4a4d5a';
    const n = style === 0 ? 5 : style === 1 ? 8 : 4;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.beginPath(); g.ellipse(c + Math.cos(a) * c * 0.56, c + Math.sin(a) * c * 0.56, c * (style === 1 ? 0.1 : 0.17), c * 0.2, a, 0, 7); g.fill(); }
    g.fillStyle = '#8f96a6'; g.beginPath(); g.arc(c, c, c * 0.2, 0, 7); g.fill();
    g.strokeStyle = '#6b7080'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, c * 0.9, 0, 7); g.stroke();
  }) })),
};

/** Collects geometries per material and emits one merged mesh each. */
export class Bag {
  private map = new Map<THREE.Material, THREE.BufferGeometry[]>();
  /** rounding segments for box(): 2 = smooth hero trim, 1 = cheap interior filler */
  seg = 2;
  add(mat: THREE.Material, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
    (this.map.get(mat) ?? this.map.set(mat, []).get(mat)!).push(g);
    return this;
  }
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, r = 0.02, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new RoundedBoxGeometry(w, h, d, this.seg, Math.min(r, Math.min(w, h, d) * 0.49)), x, y, z, rx, ry, rz);
  }
  /** mirrored pair at ±x */
  pair(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, r = 0.02) { return this.box(mat, w, h, d, x, y, z, r).box(mat, w, h, d, -x, y, z, r); }
  build(parent: THREE.Object3D, shadow = true) {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.map) { const m = new THREE.Mesh(mergeGeometries(list, false)!, mat); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); out.push(m); }
    this.map.clear(); return out;
  }
}

/** A wheel spinning about its local X axis; symmetric so it works on either side. */
export function makeWheel(r: number, width: number, hub = 0): THREE.Group {
  const g = new THREE.Group(), bag = new Bag(), hw = width / 2, e = Math.min(0.035, r * 0.12);
  const prof = [[r * 0.62, -hw], [r - e, -hw], [r, -hw + e], [r, hw - e], [r - e, hw], [r * 0.62, hw]].map(([x, y]) => new THREE.Vector2(x, y));
  bag.add(M.tire(), new THREE.LatheGeometry(prof, 28), 0, 0, 0, 0, 0, Math.PI / 2);
  const disc = new THREE.CircleGeometry(r * 0.66, 28);
  bag.add(M.hub(hub), disc, hw * 0.82, 0, 0, 0, Math.PI / 2, 0).add(M.hub(hub), disc, -hw * 0.82, 0, 0, 0, -Math.PI / 2, 0);
  bag.build(g);
  return g;
}

const PLATE_CH = 'ABCDEFGHJKLMNPRSTUVWXYZ', plates = new Map<number, THREE.Material>();
/** Number plate material with invented characters. */
export function plateMat(seed: number) {
  let m = plates.get(seed);
  if (!m) {
    const R = rng(seed * 7919 + 13);
    const txt = `${R.pick([...PLATE_CH])}${R.pick([...PLATE_CH])}${R.int(0, 9)} ${R.int(0, 9)}${R.int(0, 9)}${R.pick([...PLATE_CH])}`;
    m = toon('#ffffff', { map: paintTex(128, 40, (g, w, h) => {
      g.fillStyle = '#f4f0e2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#30405e'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
      g.fillStyle = '#1f2d4d'; g.font = 'bold 26px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 2);
    }) });
    plates.set(seed, m);
  }
  return m;
}
export function plateGeo() { return new THREE.PlaneGeometry(0.42, 0.12); }
