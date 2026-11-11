/** Birds: pigeon (≈0.32 m) and gull (≈0.55 m). +Z forward. Wings flap as a pure function of phase. */
import * as THREE from 'three';
import { toon, paintTex, rng } from '../../engine/look';

export interface Bird { group: THREE.Group; /** phase in cycles; glide 0..1 blends to a spread-wing glide */ pose(phase: number, glide?: number): void }

const mats = new Map<string, THREE.Material>();
const mat = (k: string, f: () => THREE.Material) => mats.get(k) ?? mats.set(k, f()).get(k)!;
const wingTex = (kind: 'pigeon' | 'gull') => paintTex(128, 64, (g, w, h) => {
  if (kind === 'pigeon') {
    g.fillStyle = '#aab3c4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3d4354'; g.fillRect(w * 0.12, h * 0.62, w * 0.5, h * 0.1); g.fillRect(w * 0.1, h * 0.82, w * 0.56, h * 0.1);   // two wing bars
    g.fillStyle = '#4a5063'; g.beginPath(); g.moveTo(w * 0.6, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w * 0.72, h); g.fill();    // dark primaries
  } else {
    g.fillStyle = '#b9c2cf'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f7f7f2'; g.fillRect(0, h * 0.84, w * 0.8, h * 0.16);                                                               // white trailing edge
    g.fillStyle = '#23252e'; g.beginPath(); g.moveTo(w * 0.8, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w * 0.86, h); g.fill();   // black tips
  }
});

/** Flat feathered plate in the XZ plane from outline points [x, z]; uv: u along span, v leading → trailing edge. */
function plate(pts: [number, number][], u0: number, u1: number, span: number, chord: number) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, u0 + (u1 - u0) * (p.getX(i) / span), 1 - (0.5 - p.getZ(i) / chord));
  g.computeVertexNormals(); return g;
}

export function makeBird(kind: 'pigeon' | 'gull', seed = 1): Bird {
  const R = rng(seed * 131 + (kind === 'gull' ? 7 : 3)), gull = kind === 'gull';
  const S = (gull ? 0.55 : 0.32) * R.range(0.94, 1.06), group = new THREE.Group();
  const bodyC = gull ? '#f6f5f0' : R.pick(['#8e98ab', '#7f8aa0', '#9aa1ae', '#a79d98']), bellyC = gull ? '#ffffff' : '#b7bdca';
  const body = mat(kind + bodyC, () => toon(bodyC)), belly = mat(kind + 'belly', () => toon(bellyC));
  const wing = mat(kind + 'wing', () => toon('#ffffff', { map: wingTex(kind), side: THREE.DoubleSide }));
  const dark = mat('birdDark', () => toon('#2b2c36')), beakM = mat(kind + 'beak', () => toon(gull ? '#f0b63a' : '#d8a48e')), feet = mat('birdFeet', () => toon(gull ? '#e9a13c' : '#d9727a'));
  const add = (m: THREE.Material, g: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x * S, y * S, z * S); o.scale.set(sx * S, sy * S, sz * S); o.rotation.x = rx; o.castShadow = true; group.add(o); return o; };
  const sph = new THREE.SphereGeometry(1, 14, 10);
  add(body, sph, 0, 0, 0, gull ? 0.15 : 0.17, gull ? 0.15 : 0.17, 0.33, -0.08);                         // torso
  add(belly, sph, 0, -0.035, 0.03, gull ? 0.135 : 0.15, 0.13, 0.27, -0.08);                             // paler belly
  add(body, sph, 0, 0.1, 0.3, 0.095, 0.095, 0.1);                                                       // head
  if (!gull) add(mat('pigeonNeck', () => toon('#5d7f73')), sph, 0, 0.045, 0.22, 0.105, 0.085, 0.09, -0.5);   // iridescent collar
  add(beakM, new THREE.ConeGeometry(0.03, gull ? 0.14 : 0.08, 8).rotateX(Math.PI / 2), 0, 0.085, gull ? 0.44 : 0.41);
  for (const s of [1, -1]) { add(dark, sph, s * 0.07, 0.115, 0.35, 0.016, 0.016, 0.016); add(feet, new THREE.BoxGeometry(0.03, 0.03, 0.12), s * 0.06, -0.15, -0.1); }
  const tailM = gull ? body : dark;
  add(tailM, plate([[-0.07, -0.2], [0.07, -0.2], [0.12, -0.46], [0.05, -0.5], [0, -0.47], [-0.05, -0.5], [-0.12, -0.46]], 0, 1, 1, 1), 0, 0.01, 0).material = mat(kind + 'tail', () => toon(gull ? '#f6f5f0' : '#3d4354', { side: THREE.DoubleSide }));
  // wings: inner (arm) and outer (hand) plates, hinged
  const L1 = gull ? 0.52 : 0.4, L2 = gull ? 0.72 : 0.5, C = gull ? 0.26 : 0.3, span = L1 + L2;
  const inner = plate([[0, C * 0.5], [L1, C * 0.46], [L1, -C * 0.42], [L1 * 0.66, -C * 0.56], [L1 * 0.33, -C * 0.5], [0, -C * 0.5]], 0, L1 / span, L1, C);
  const outer = plate([[0, C * 0.46], [L2 * 0.5, C * 0.36], [L2, -C * 0.02], [L2 * 0.84, -C * 0.2], [L2 * 0.62, -C * 0.3], [L2 * 0.4, -C * 0.4], [L2 * 0.18, -C * 0.44], [0, -C * 0.42]], L1 / span, 1, L2, C);
  const wings = [1, -1].map((s) => {
    const sh = new THREE.Group(), el = new THREE.Group();
    sh.position.set(s * 0.1 * S, 0.07 * S, 0.06 * S); el.position.set(L1 * S, 0, 0);
    const a = new THREE.Mesh(inner, wing), b = new THREE.Mesh(outer, wing); a.scale.setScalar(S); b.scale.setScalar(S); a.castShadow = b.castShadow = true;
    sh.add(a, el); el.add(b);
    const flip = new THREE.Group(); flip.scale.x = s; flip.add(sh); sh.position.x = 0.1 * S; group.add(flip);
    return { sh, el };
  });
  const off = R() * 0.2;
  const pose = (phase: number, glide = 0) => {
    const a = (phase + off) * Math.PI * 2, k = 1 - glide;
    const up = (gull ? 0.75 : 1.0) * Math.sin(a) * k + 0.14 * glide + 0.1 * k;            // + = wing raised
    const tip = (gull ? 0.5 : 0.65) * Math.sin(a - 1.1) * k + 0.06 * glide;                // hand lags the arm
    const sweep = 0.22 * Math.cos(a) * k - 0.1 * glide;                                   // forward on the downstroke
    for (const w of wings) { w.sh.rotation.set(0, sweep, up, 'ZYX'); w.el.rotation.set(0, sweep * 0.6 - 0.12 * glide, tip - 0.25 * Math.max(0, Math.sin(a)) * k); }
    group.children[0].position.y = -0.012 * S * Math.sin(a) * k;                           // body bobs against the stroke
  };
  pose(0.2, 0);
  return { group, pose };
}
