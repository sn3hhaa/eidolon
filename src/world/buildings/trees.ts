/** Street and plaza trees: clumped multi-lobe canopies with leaf tufts, merged into one swaying mesh. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, toon } from '../../engine/look';
import { L } from '../layout';

type Rnd = ReturnType<typeof rng>;
const GREENS: [string, string][] = [['#2f6b3c', '#7fbf4f'], ['#2a6144', '#6fb35a'], ['#3b6f2f', '#9ccc52'], ['#27594a', '#5fae6e']];
const BLOSSOM: [string, string][] = [['#c9638a', '#ffc4d6'], ['#b58a2f', '#f7dd6a']];

/** Lumpy blob; uv = (sway phase, sway weight), vertex colours shaded dark-below → light-above. */
function blob(detail: number, r: THREE.Vector3, p: THREE.Vector3, lo: THREE.Color, hi: THREE.Color, R: Rnd, phase: number, sway: number, lump = 0.16) {
  const g = new THREE.IcosahedronGeometry(1, detail).toNonIndexed(), pos = g.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), uv = new Float32Array(n * 2), a = R() * 9, b = R() * 9, c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + lump * (Math.sin(v.x * 3.1 + a) * Math.sin(v.y * 2.7 + b) + 0.6 * Math.sin(v.z * 4.3 + a + b));
    const t = THREE.MathUtils.smoothstep(v.y, -0.7, 0.9);
    c.copy(lo).lerp(hi, t * 0.85); col.set([c.r, c.g, c.b], i * 3); uv.set([phase, sway], i * 2);
    pos.setXYZ(i, v.x * k * r.x + p.x, v.y * k * r.y + p.y, v.z * k * r.z + p.z);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
function limb(r0: number, r1: number, from: THREE.Vector3, to: THREE.Vector3, color: string) {
  const len = from.distanceTo(to), g = new THREE.CylinderGeometry(r1, r0, len, 8, 1).toNonIndexed();
  g.applyMatrix4(new THREE.Matrix4().compose(from.clone().lerp(to, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()), new THREE.Vector3(1, 1, 1)));
  const n = g.attributes.position.count, c = new THREE.Color(color), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

function tree(out: THREE.BufferGeometry[], x: number, z: number, R: Rnd, size: number, pal: [string, string]) {
  const trunkH = R.range(3.5, 4.3) * Math.min(1, 0.7 + size * 0.3), cr = 2.3 * size, phase = R() * 6.28, bark = R.pick(['#6b4a3a', '#7a5a48', '#5f4636']);
  const lean = new THREE.Vector3(R.range(-0.25, 0.25), 0, R.range(-0.25, 0.25)), top = new THREE.Vector3(x + lean.x, trunkH, z + lean.z);
  out.push(limb(0.3 * size, 0.17 * size, new THREE.Vector3(x, 0.5, z), top, bark), limb(0.46 * size, 0.29 * size, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 0.55, z), bark));
  const lo = new THREE.Color(pal[0]), hi = new THREE.Color(pal[1]), cy = trunkH + cr * 0.55, lobes: [THREE.Vector3, number][] = [];
  const nl = R.int(6, 8);
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * 6.283 + R.range(-0.3, 0.3), rad = i === 0 ? 0 : cr * R.range(0.45, 0.72), lr = cr * R.range(0.5, 0.68);
    const p = new THREE.Vector3(top.x + Math.cos(a) * rad, cy + (i === 0 ? cr * 0.45 : R.range(-0.25, 0.4) * cr), top.z + Math.sin(a) * rad);
    p.y = Math.max(p.y, 2.75 + lr * 0.8);
    lobes.push([p, lr]);
    const tint = R.range(-0.04, 0.04), l2 = lo.clone().offsetHSL(tint * 0.3, 0, tint), h2 = hi.clone().offsetHSL(tint * 0.3, 0, tint + (p.y - cy) * 0.02);
    out.push(blob(2, new THREE.Vector3(lr, lr * 0.8, lr), p, l2, h2, R, phase + i, 0.5 + (p.y - trunkH) / (cr * 2)));
    if (i > 0 && i % 2 === 0) out.push(limb(0.1 * size, 0.05 * size, top.clone().setY(trunkH - 0.5), p.clone().lerp(top, 0.35), bark));
  }
  for (let i = 0; i < 46; i++) {                                    // leaf tufts break the silhouette
    const [p, lr] = lobes[i % lobes.length], d = new THREE.Vector3(R.range(-1, 1), R.range(-0.5, 1), R.range(-1, 1)).normalize(), s = R.range(0.28, 0.52) * size;
    const q = p.clone().add(new THREE.Vector3(d.x * lr * 0.98, d.y * lr * 0.8, d.z * lr * 0.98)); if (q.y < 2.8) continue;
    const tint = R.range(-0.05, 0.07);
    out.push(blob(0, new THREE.Vector3(s, s * 0.75, s), q, lo.clone().offsetHSL(0, 0, tint), hi.clone().offsetHSL(0, 0.03, tint), R, phase + i * 0.7, 0.8 + (q.y - trunkH) / (cr * 2), 0.1));
  }
}

export function buildTrees(solids: number[][]) {
  const R = rng(777), geos: THREE.BufferGeometry[] = [], spots: [number, number, number, boolean][] = [];
  for (let x = -120; x <= 108; x += 12) for (const s of [-1, 1]) {
    if (x > 38 && x < 58) continue;                       // Harbor Ave crossing
    if (s > 0 && x >= 12 && x <= 62) continue;            // stunt line + High Walk footprint
    spots.push([x, s * 6.0, R.range(0.92, 1.12), false]);
  }
  for (let z = -66; z <= 54; z += 12) { if (Math.abs(z) < 10 || (z >= -6 && z <= 24)) continue; spots.push([41.2, z, R.range(0.85, 1), false]); if (z < 0) spots.push([54.8, z, R.range(0.85, 1), false]); }
  const c = L.court, sp = L.splash;
  for (const z of [13.5, 19.5, 25]) { spots.push([c.x0 + 1.0, z, 0.8, z === 19.5]); spots.push([c.x1 - 1.0, z, 0.8, false]); }
  for (const z of [15, 21.5]) { spots.push([sp.x0 + 1.4, z, 0.85, z === 15]); spots.push([sp.x1 - 1.4, z, 0.85, false]); }
  spots.push([35.5, 21.5, 0.9, true]);
  for (const [x, z, size, bloom] of spots) { tree(geos, x, z, R, size, bloom ? R.pick(BLOSSOM) : R.pick(GREENS)); solids.push([x - 0.25, z - 0.25, x + 0.25, z + 0.25, 3]); }
  const geo = mergeGeometries(geos, false); for (const g of geos) g.dispose();
  const uTime = { value: 0 }, mat = toon('#ffffff', { vertexColors: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = uv.y;
      transformed.x += (sin(uTime * 1.1 + uv.x) * 0.07 + sin(uTime * 2.9 + uv.x * 1.7 + position.y * 1.3) * 0.022) * sw;
      transformed.z += (cos(uTime * 0.9 + uv.x * 1.3) * 0.055 + sin(uTime * 3.3 + uv.x + position.x * 1.1) * 0.018) * sw;
      transformed.y += sin(uTime * 2.3 + uv.x * 2.1 + position.z) * 0.014 * sw;`);
  };
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  const group = new THREE.Group(); group.add(mesh);
  return { group, tris: geo.attributes.position.count / 3, setTime(tw: number) { uTime.value = tw; } };
}
