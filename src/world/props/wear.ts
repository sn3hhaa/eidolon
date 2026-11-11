/** Kite, ice cream, and the protagonist's wearables (headphones, crossbody bag). */
import * as THREE from 'three';
import { toon, paintTex } from '../../engine/look';
import { Bag, M } from '../vehicles/parts';

const cache = new Map<string, THREE.Material>();
const memo = (k: string, f: () => THREE.Material) => cache.get(k) ?? cache.set(k, f()).get(k)!;

export function makeKite(): THREE.Group {
  const g = new THREE.Group(), cols = ['#ef5a3c', '#f6c443', '#2f9fb8', '#f3ecd8'];
  const top: [number, number] = [0, 0.42], bot: [number, number] = [0, -0.6], l: [number, number] = [-0.36, 0.1], r: [number, number] = [0.36, 0.1], c: [number, number] = [0, 0.1];
  [[top, r, c], [top, c, l], [c, r, bot], [l, c, bot]].forEach((tri, i) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap(([x, y]) => [x, y, -0.03 * (1 - Math.abs(x) / 0.36)]), 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, memo('kite' + i, () => toon(cols[i], { side: THREE.DoubleSide }))); m.castShadow = true; g.add(m);
  });
  const bag = new Bag(); bag.box(M.dark(), 0.012, 1.02, 0.012, 0, -0.09, 0.004, 0.003).box(M.dark(), 0.72, 0.012, 0.012, 0, 0.1, 0.004, 0.003);
  for (let i = 0; i < 7; i++) {                                                     // tail: string with bows, swinging away
    const t = (i + 1) / 7, x = 0.22 * Math.sin(t * 3.2) * t, y = -0.6 - t * 0.95, z = 0.12 * t;
    bag.box(memo('kiteBow' + (i % 3), () => toon(cols[i % 3], { side: THREE.DoubleSide })), 0.11, 0.035, 0.004, x, y, z, 0.001, 0, 0, 0.5 - (i % 2));
    if (i) { const px = 0.22 * Math.sin(((i) / 7) * 3.2) * (i / 7), py = -0.6 - (i / 7) * 0.95, pz = 0.12 * (i / 7), d = Math.hypot(x - px, y - py, z - pz); bag.box(M.dark(), 0.004, d, 0.004, (x + px) / 2, (y + py) / 2, (z + pz) / 2, 0.001, 0, 0, Math.atan2(-(x - px), y - py)); }
  }
  bag.build(g); return g;
}

export function makeIceCream(): THREE.Group {
  const g = new THREE.Group();
  const waffle = memo('waffle', () => toon('#ffffff', { map: paintTex(64, 64, (c, w, h) => { c.fillStyle = '#d9a25a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b57a38'; c.lineWidth = 2; for (let i = -64; i < 128; i += 10) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); } }) }));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.13, 16, 1, true).rotateX(Math.PI), waffle); cone.name = 'cone'; cone.position.y = 0.065; cone.castShadow = true;
  const scoop = new THREE.Group(); scoop.name = 'scoop'; scoop.position.y = 0.15;
  const pink = memo('scoop', () => toon('#f48fb0')), s = new THREE.SphereGeometry(1, 16, 12);
  for (const [x, y, z, r] of [[0, 0, 0, 0.04], [0.02, -0.022, 0.01, 0.022], [-0.022, -0.02, -0.012, 0.02], [0.004, -0.024, -0.024, 0.02], [-0.006, 0.02, 0.008, 0.028]]) { const m = new THREE.Mesh(s, pink); m.position.set(x, y, z); m.scale.setScalar(r); m.castShadow = true; scoop.add(m); }
  g.add(cone, scoop); return g;
}

/** Over-ear headphones for a head ≈ 0.19 m wide. Origin at head centre, band over +Y, cups at ±X. Children: 'band', 'cupL' (+X), 'cupR'. */
export function makeHeadphones(color: string, accent: string): THREE.Group {
  const g = new THREE.Group(), body = toon(color), acc = toon(accent), pad = memo('hpPad', () => toon('#2c2b33')), Rb = 0.112;
  const band = new THREE.Group(); band.name = 'band';
  const bb = new Bag();
  bb.add(body, new THREE.TorusGeometry(Rb, 0.011, 8, 28, Math.PI * 0.86).rotateZ(Math.PI * 0.07));                 // arc over the crown
  bb.add(pad, new THREE.TorusGeometry(Rb - 0.006, 0.014, 8, 14, Math.PI * 0.36).rotateZ(Math.PI * 0.32));          // crown cushion
  for (const s of [1, -1]) bb.box(acc, 0.012, 0.07, 0.02, s * (Rb - 0.003), 0.012, 0, 0.004);                       // sliders
  bb.build(band); g.add(band);
  for (const s of [1, -1]) {
    const cup = new THREE.Group(); cup.name = s > 0 ? 'cupL' : 'cupR'; cup.position.set(s * 0.1, -0.012, 0.004);
    const cb = new Bag(), rot = (geo: THREE.BufferGeometry) => geo.rotateZ(Math.PI / 2);
    cb.add(pad, rot(new THREE.TorusGeometry(0.036, 0.013, 8, 20).rotateX(Math.PI / 2)), -s * 0.006, 0, 0);          // ear cushion
    cb.add(body, rot(new THREE.CylinderGeometry(0.046, 0.05, 0.03, 22)), s * 0.014, 0, 0);                          // shell
    cb.add(acc, rot(new THREE.CylinderGeometry(0.03, 0.034, 0.008, 20)), s * 0.032, 0, 0);                          // accent cap
    cb.add(body, rot(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 12)), s * 0.036, 0, 0);
    cb.box(body, 0.012, 0.05, 0.07, s * 0.022, 0.03, 0, 0.005);                                                    // yoke
    cb.build(cup); g.add(cup);
  }
  return g;
}

/** Compact sling bag ≈ 0.26 × 0.16 × 0.09. Origin at the bag centre; +Z is the outward face. */
export function makeCrossbodyBag(color: string, accent: string): THREE.Group {
  const g = new THREE.Group(), bag = new Bag(), body = toon(color), acc = toon(accent), W = 0.26, H = 0.16, D = 0.09;
  bag.box(body, W, H, D, 0, 0, 0, 0.035);
  bag.box(body, W * 0.98, H * 0.52, 0.03, 0, H * 0.2, D / 2 + 0.004, 0.014);                                      // flap
  bag.box(acc, W * 0.86, 0.012, 0.012, 0, -0.012, D / 2 + 0.016, 0.004);                                           // flap piping
  bag.box(body, W * 0.6, H * 0.34, 0.022, 0, -H * 0.24, D / 2 + 0.004, 0.01);                                     // front pocket
  bag.box(acc, W * 0.5, 0.008, 0.008, 0, -H * 0.1, D / 2 + 0.017, 0.003);                                          // pocket zip
  bag.box(M.chrome(), 0.012, 0.022, 0.006, W * 0.25, -H * 0.115, D / 2 + 0.02, 0.002);                             // zip pull
  bag.box(M.dark(), 0.05, 0.034, 0.012, 0, 0.006, D / 2 + 0.024, 0.005).box(M.chrome(), 0.03, 0.016, 0.006, 0, 0.006, D / 2 + 0.032, 0.003);   // buckle
  bag.box(acc, W + 0.004, 0.014, D * 0.6, 0, H / 2 - 0.01, -0.004, 0.005);                                        // top zip band
  for (const s of [1, -1]) { bag.add(M.chrome(), new THREE.TorusGeometry(0.014, 0.0035, 6, 14), s * (W / 2 - 0.012), H / 2 + 0.008, -0.01, 0, Math.PI / 2, 0); bag.box(body, 0.03, 0.03, 0.012, s * (W / 2 - 0.012), H / 2 - 0.012, -0.01, 0.004); }
  bag.box(memo('bagTag', () => toon('#f6f1e6')), 0.04, 0.026, 0.004, -W * 0.3, H * 0.3, D / 2 + 0.021, 0.002);     // woven label
  bag.build(g); return g;
}
