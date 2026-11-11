/** Backdrop ring: mid-distance window-grid blocks, hazy far skyline, two layers of hills. No sea-side (south) content. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paintTex, rng, toon } from '../../engine/look';

type Rnd = ReturnType<typeof rng>;

function gridMat(wall: string, glass: string, R: Rnd) {
  const t = paintTex(256, 256, (g) => {
    g.fillStyle = wall; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#30304a'; g.globalAlpha = 0.05; g.beginPath(); g.ellipse(R() * 256, R() * 256, R.range(20, 70), R.range(10, 30), 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      g.fillStyle = R() < 0.12 ? '#f1dca4' : glass; g.fillRect(c * 64 + 14, r * 64 + 12, 36, 34);
      g.fillStyle = '#ffffff'; g.globalAlpha = 0.25; g.fillRect(c * 64 + 14, r * 64 + 12, 36, 6); g.globalAlpha = 1;
      g.strokeStyle = '#4a4a66'; g.lineWidth = 1.5; g.strokeRect(c * 64 + 14, r * 64 + 12, 36, 34);
    }
    g.fillStyle = 'rgba(40,40,70,0.25)'; for (let r = 0; r < 4; r++) g.fillRect(0, r * 64 + 58, 256, 3);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return toon('#cfd8f0', { map: t });      // hazy tint: mid-distance blocks recede behind the street
}

/** Box walls with metre-scaled uvs (one tile = 12.8 m), plus a plain cap. */
function tower(x: number, z: number, w: number, d: number, h: number, ry: number) {
  const out: THREE.BufferGeometry[] = [];
  for (const [fw, off, rot] of [[w, d / 2, 0], [w, d / 2, Math.PI], [d, w / 2, Math.PI / 2], [d, w / 2, -Math.PI / 2]] as [number, number, number][]) {
    const g = new THREE.PlaneGeometry(fw, h).toNonIndexed(), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(fw / 12.8)), uv.getY(i) * Math.max(1, Math.round(h / 12.8)));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(rot).multiply(new THREE.Matrix4().makeTranslation(0, h / 2, off)));
    out.push(g);
  }
  const cap = new THREE.BoxGeometry(w + 0.8, 1.2, d + 0.8).toNonIndexed().translate(0, h + 0.6, 0), cuv = cap.attributes.uv; for (let i = 0; i < cuv.count; i++) cuv.setXY(i, 0.02, 0.985);
  out.push(cap);
  const g = mergeGeometries(out, false); g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z)); return g;
}

function ridge(radius: number, base: number, amp: number, seed: number, lo: string, hi: string) {
  const R = rng(seed), N = 220, pos: number[] = [], col: number[] = [], ph = [R() * 9, R() * 9, R() * 9], cl = new THREE.Color(lo), ch = new THREE.Color(hi);
  const top = (i: number) => { const a = (i / N) * Math.PI * 2, x = Math.cos(a) * radius, z = Math.sin(a) * radius; const fade = 1 - THREE.MathUtils.smoothstep(z, radius * 0.12, radius * 0.5); return [x, (base + amp * (0.55 + 0.3 * Math.sin(a * 5 + ph[0]) + 0.2 * Math.sin(a * 11 + ph[1]) + 0.1 * Math.sin(a * 23 + ph[2]))) * fade - 6 * (1 - fade), z]; };
  for (let i = 0; i < N; i++) {
    const a = top(i), b = top(i + 1);
    pos.push(a[0], -8, a[2], b[0], -8, b[2], b[0], b[1], b[2], a[0], -8, a[2], b[0], b[1], b[2], a[0], a[1], a[2]);
    for (const k of [0, 0, 1, 0, 1, 1]) { const c = k ? ch : cl; col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false })); m.frustumCulled = false; return m;
}

export function buildBackdrop(_n: number) {
  const R = rng(4242), group = new THREE.Group();
  const mats = [gridMat('#e9d9c0', '#56789c', R), gridMat('#d9a48a', '#4f6f93', R), gridMat('#b9cbe0', '#44648c', R), gridMat('#f0e6d8', '#6a8fb0', R), gridMat('#c9b7d6', '#506a94', R)];
  const lists: THREE.BufferGeometry[][] = mats.map(() => []);
  const put = (x: number, z: number, lo: number, hi: number) => { const w = R.range(16, 30), d = R.range(16, 28), h = R.range(lo, hi), ry = R.range(-0.12, 0.12), l = R.pick(lists); l.push(tower(x, z, w, d, h, ry)); if (R() < 0.55) { const t = tower(0, 0, w * 0.6, d * 0.6, R.range(6, 16), 0); t.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, h + 1.2, z)); l.push(t); } };
  for (let x = -230; x <= 230; x += 34) for (let z = -190; z <= -104; z += 36) put(x + R.range(-8, 8), z + R.range(-8, 8), 22, 52 + (z < -150 ? 22 : 0));
  for (const sx of [-1, 1]) for (let x = 150; x <= 232; x += 34) for (let z = -90; z <= 56; z += 36) put(sx * (x + R.range(-6, 6)), z + R.range(-8, 8), 20, 48);
  lists.forEach((l, i) => { if (!l.length) return; const m = new THREE.Mesh(mergeGeometries(l, false), mats[i]); m.castShadow = false; m.receiveShadow = false; group.add(m); });
  // far skyline: flat hazy silhouettes
  const far: THREE.BufferGeometry[] = [], tint = ['#a9bde2', '#b7c6e8', '#9fb3dc', '#c3cdea', '#b0b9e0'];
  for (let i = 0; i < 96; i++) {
    const a = Math.PI + (i / 95) * Math.PI + R.range(-0.02, 0.02), rad = R.range(300, 420), x = Math.cos(a) * rad, z = Math.sin(a) * rad + 30;
    const w = R.range(16, 44), h = R.range(24, 70) * (R() < 0.15 ? 1.7 : 1), g = new THREE.BoxGeometry(w, h, R.range(16, 30)).toNonIndexed(); g.translate(x, h / 2 - 2, z);
    const c = new THREE.Color(R.pick(tint)).offsetHSL(0, 0, (rad - 360) * 0.0006), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const y = g.attributes.position.getY(k), s = y > h * 0.5 ? 1.03 : 0.94; col.set([c.r * s, c.g * s, c.b * s], k * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); g.deleteAttribute('normal'); far.push(g);
  }
  const fm = new THREE.Mesh(mergeGeometries(far, false), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); group.add(fm);
  group.add(ridge(540, 26, 46, 5, '#7fa6b4', '#8fb89a'), ridge(790, 60, 90, 9, '#a8bfe0', '#c2d2ec'));
  return group;
}
