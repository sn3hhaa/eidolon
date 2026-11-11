/** Small hand props and frozen-moment debris. */
import * as THREE from 'three';
import { toon, paintTex, rng } from '../../engine/look';
import { Bag, M } from '../vehicles/parts';

const cache = new Map<string, THREE.Material>();
const memo = (k: string, f: () => THREE.Material) => cache.get(k) ?? cache.set(k, f()).get(k)!;
const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };

export function makeBasketball(): THREE.Mesh {
  const m = memo('bball', () => toon('#ffffff', { map: paintTex(512, 256, (g, w, h) => {
    g.fillStyle = '#e8762a'; g.fillRect(0, 0, w, h);
    const R = rng(5); g.fillStyle = '#d5651f'; for (let i = 0; i < 1500; i++) g.fillRect(R() * w, R() * h, 2, 2);
    g.strokeStyle = '#1f1a1c'; g.lineWidth = 7; g.lineCap = 'round';
    const line = (f: (v: number) => number) => { g.beginPath(); for (let i = 0; i <= 40; i++) { const v = i / 40, x = f(v) * w, y = v * h; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    for (const u of [0.002, 0.5, 0.998]) line(() => u);
    for (const u of [0.25, 0.75]) for (const s of [1, -1]) line((v) => u + s * 0.115 * Math.cos((v - 0.5) * Math.PI));
  }) }));
  return mesh(new THREE.SphereGeometry(0.12, 32, 20), m);
}
export function makeOrange(): THREE.Mesh {
  const m = memo('orange', () => toon('#ffffff', { map: paintTex(64, 32, (g, w, h) => { g.fillStyle = '#f59a23'; g.fillRect(0, 0, w, h); g.fillStyle = '#e07f12'; const R = rng(9); for (let i = 0; i < 60; i++) g.fillRect(R() * w, R() * h, 1.5, 1.5); g.fillStyle = '#4f7a2e'; g.fillRect(0, 0, w, 2.5); }) }));
  return mesh(new THREE.SphereGeometry(0.04, 16, 12), m);
}
export function makeCrate(): THREE.Group {
  const g = new THREE.Group(), bag = new Bag(), wood = memo('crate', () => toon('#c79a62')), dark = memo('crate2', () => toon('#a67a48'));
  const W = 0.5, D = 0.3, H = 0.25;
  bag.box(dark, W, 0.012, D, 0, 0.006, 0, 0.003);
  for (let i = 0; i < 3; i++) { const y = 0.045 + i * 0.085; bag.box(wood, W, 0.065, 0.012, 0, y, D / 2, 0.004).box(wood, W, 0.065, 0.012, 0, y, -D / 2, 0.004).box(wood, 0.012, 0.065, D, W / 2, y, 0, 0.004).box(wood, 0.012, 0.065, D, -W / 2, y, 0, 0.004); }
  for (const x of [1, -1]) for (const z of [1, -1]) bag.box(dark, 0.03, H, 0.03, x * (W / 2 - 0.012), H / 2, z * (D / 2 - 0.012), 0.004);
  bag.build(g); return g;
}
export function makePaperCup(): THREE.Group {
  const g = new THREE.Group(), bag = new Bag();
  const P = (a: [number, number][]) => new THREE.LatheGeometry(a.map(([x, y]) => new THREE.Vector2(x, y)), 18);
  bag.add(memo('cup', () => toon('#f6f1e6')), P([[0, 0], [0.03, 0], [0.041, 0.115], [0.043, 0.118]]));
  bag.add(memo('cupSleeve', () => toon('#b5774a')), P([[0.0345, 0.035], [0.0395, 0.085], [0.0375, 0.085], [0.0325, 0.035]]));
  bag.add(memo('cupLid', () => toon('#3b3a40')), P([[0.045, 0.114], [0.045, 0.124], [0.036, 0.132], [0, 0.132]]));
  bag.build(g); return g;
}
/** A frozen arc of coffee leaving a cup: origin at the cup mouth, arc toward +X/+Y. */
export function makeCupSplash(): THREE.Group {
  const g = new THREE.Group(), m = memo('coffee', () => toon('#6b4226')), R = rng(77), s = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 16; i++) {
    const t = i / 15, o = mesh(s, m), r = 0.022 * (1 - t * 0.6) * R.range(0.6, 1.2);
    o.position.set(t * 0.26 + R.range(-0.012, 0.012), 0.02 + t * 0.2 - t * t * 0.16 + R.range(-0.012, 0.012), R.range(-0.02, 0.02) * (1 + t));
    o.scale.set(r * R.range(1, 1.9), r, r); o.rotation.z = 0.7 - t * 1.2; g.add(o);
  }
  return g;
}
export function makeNewspaperSheet(seed: number): THREE.Mesh {
  const R = rng(seed * 17 + 5), g = new THREE.PlaneGeometry(0.4, 0.56, 10, 14), p = g.attributes.position;
  const a = R.range(4, 9), b = R.range(3, 7), ph = R() * 6, amp = R.range(0.03, 0.07);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, amp * Math.sin(x * a + ph) + amp * 0.8 * Math.sin(y * b + ph * 1.7) + 0.5 * x * x * R.range(-1, 2)); }
  g.computeVertexNormals();
  const m = memo('news', () => toon('#ffffff', { side: THREE.DoubleSide, map: paintTex(256, 360, (c, w, h) => {
    c.fillStyle = '#ece6d6'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f2e33'; c.fillRect(14, 14, w - 28, 26); c.fillStyle = '#8c8a88'; c.fillRect(14, 54, 110, 84);
    c.fillStyle = '#77757a'; for (let col = 0; col < 3; col++) for (let y = 54; y < h - 16; y += 7) { if (col === 0 && y < 146) continue; c.fillRect(14 + col * 78 + (col ? 0 : 0), y, 70 - ((y * 13) % 17), 3); }
  }) }));
  return mesh(g, m);
}
const LEAF = [['#7fae4a', '#5f8f3a'], ['#d9a13a', '#b97a2a'], ['#c8642e', '#9f4a22'], ['#9cbb52', '#7a9a3e']];
export function makeLeaf(seed: number): THREE.Mesh {
  const R = rng(seed * 29 + 1), k = R.int(0, LEAF.length - 1);
  const m = memo('leaf' + k, () => toon('#ffffff', { side: THREE.DoubleSide, map: paintTex(32, 16, (c, w, h) => { c.fillStyle = LEAF[k][0]; c.fillRect(0, 0, w, h / 2); c.fillStyle = LEAF[k][1]; c.fillRect(0, h / 2, w, h / 2); c.fillStyle = '#f0e6b0'; c.globalAlpha = 0.5; c.fillRect(0, h / 2 - 0.7, w, 1.4); }) }));
  const s = new THREE.Shape(); s.moveTo(-0.04, 0); s.quadraticCurveTo(-0.01, 0.022, 0.04, 0); s.quadraticCurveTo(-0.01, -0.022, -0.04, 0);
  const g = new THREE.ShapeGeometry(s, 6), p = g.attributes.position, uv = g.attributes.uv, curl = R.range(4, 14), tw = R.range(-6, 6);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); uv.setXY(i, (x + 0.04) / 0.08, 0.5 + y / 0.044); p.setZ(i, curl * x * x + tw * x * y); }
  g.computeVertexNormals(); g.scale(R.range(0.8, 1.25), R.range(0.8, 1.25), 1);
  return mesh(g, m);
}
export function makeFrisbee(color: string): THREE.Mesh {
  const prof = [[0, 0.018], [0.09, 0.016], [0.122, 0.006], [0.13, -0.008], [0.124, -0.012], [0.116, 0.0], [0.088, 0.008], [0, 0.01]].map(([x, y]) => new THREE.Vector2(x, y));
  return mesh(new THREE.LatheGeometry(prof, 28), toon(color, { side: THREE.DoubleSide }));
}
export { M as vehicleMats };
