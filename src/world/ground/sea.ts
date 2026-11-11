/** Stylized toon sea (world-time driven) and the far shore across the bay. */
import * as THREE from 'three';
import { SUN_DIR, flat, rng } from '../../engine/look';
import { L } from '../layout';
import type { Ctx } from './kit';

const VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const FRAG = /* glsl */ `
uniform float uT; uniform vec3 uSun, uDeep, uMid, uLite, uHaze, uFoam; varying vec3 vW;
float wave(vec2 p, float t){ return sin(p.x*.33 + sin(p.y*.19 + t*.5)*1.4 + t*.7) * sin(p.y*.47 - t*.45 + sin(p.x*.11 - t*.2)*1.9); }
void main(){
  vec2 p = vW.xz; vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
  float lod = clamp(dist/260., 0., 1.);
  float w1 = wave(p, uT), w2 = wave(p*2.7 + 13., uT*1.3), w3 = wave(p*.35 - 40., uT*.6);
  float h = w1*.6 + w2*.3*(1.-lod) + w3*.5;
  // painted bands: deep → mid → light streaks, wider apart toward the horizon
  vec3 c = mix(uDeep, uMid, step(-.15, h));
  c = mix(c, uLite, step(.52, h) * (1. - lod*.6));
  // shore shallows by the quay
  float shore = smoothstep(26., 0., vW.z - ${L.promenade.z1.toFixed(1)});
  c = mix(c, uLite, shore*.45*step(-.4, w2));
  // sun glitter: hard sparkles on wave facets along the reflection path
  vec2 e = vec2(.35, 0.);
  vec3 N = normalize(vec3(-(wave(p+e.xy,uT)-w1) - (wave((p+e.xy)*2.7+13.,uT*1.3)-w2)*.6, .55 + lod*1.6, -(wave(p+e.yx,uT)-w1) - (wave((p+e.yx)*2.7+13.,uT*1.3)-w2)*.6));
  float spec = pow(max(dot(reflect(-uSun, N), V), 0.), 90.);
  c = mix(c, uFoam, step(.32, spec));
  float glint = step(.965, w2*.5+.5) * step(.2, w3) * (1.-lod);
  c = mix(c, uFoam, glint*.85);
  // foam line lapping the quay wall
  float lap = smoothstep(.9, .0, vW.z - ${L.promenade.z1.toFixed(1)} - .25 - .25*sin(p.x*.8 + uT*1.1));
  c = mix(c, uFoam, step(.5, lap)*.9);
  c = mix(c, uHaze, smoothstep(180., 1300., dist)*.92);
  gl_FragColor = vec4(c, 1.);
}`;

export function buildSea(c: Ctx) {
  const col = (h: string) => new THREE.Color(h);
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uT: { value: 0 }, uSun: { value: SUN_DIR.clone() }, uDeep: { value: col('#1565b0') }, uMid: { value: col('#2389d2') }, uLite: { value: col('#52b9e4') }, uHaze: { value: col('#a9d3ee') }, uFoam: { value: col('#f4fbff') } } });
  const g = new THREE.PlaneGeometry(4200, 2400); g.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(g, mat); sea.position.set(30, L.water.y, L.promenade.z1 + 1199.6); sea.frustumCulled = false; c.group.add(sea);
  // sea bed skirt west/east of the paved quay so nothing shows under the horizon line
  c.tick.push((tw) => { mat.uniforms.uT.value = tw; });

  // far shore: layered ridge silhouettes (flat, atmospheric) across the southern horizon + a nearer green headland to the south-east
  const ridge = (z: number, x0: number, x1: number, base: number, amp: number, color: string, seed: number, curve = 0) => {
    const R = rng(seed), N = 90, pos: number[] = [];
    const hs: number[] = []; let v = 0.5;
    for (let i = 0; i <= N; i++) { v = THREE.MathUtils.clamp(v + R.range(-0.16, 0.16), 0.1, 1); const k = i / N, env = Math.pow(Math.sin(Math.PI * k), 0.5); hs.push(base + amp * v * env); }
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < N; i++) hs[i] = (hs[i - 1] + hs[i] * 2 + hs[i + 1]) / 4;
    for (let i = 0; i < N; i++) {
      const xa = x0 + ((x1 - x0) * i) / N, xb = x0 + ((x1 - x0) * (i + 1)) / N, za = z + curve * Math.pow((i / N) * 2 - 1, 2), zb = z + curve * Math.pow(((i + 1) / N) * 2 - 1, 2), y0 = L.water.y - 1;
      pos.push(xa, y0, za, xb, y0, zb, xb, hs[i + 1], zb, xa, y0, za, xb, hs[i + 1], zb, xa, hs[i], za);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(geo, flat(color, { side: THREE.DoubleSide, fog: false })); m.frustumCulled = false; c.group.add(m);
  };
  ridge(1500, -2200, 2300, 10, 170, '#9cc3e6', 71, -500);
  ridge(1180, -1700, 1500, 6, 95, '#7fb0dc', 72, -380);
  ridge(900, -300, 1400, 4, 70, '#6aa4c9', 73, -260);
  ridge(620, 240, 900, 2, 46, '#5c9a8e', 74, -120);            // green headland, SE
  ridge(700, -1300, -420, 2, 38, '#6ca39c', 75, -160);          // low cape, SW
  // a hint of a far town on the headland: pale blocks
  const R = rng(76), town = flat('#e9e2d2', { fog: false }), roof = flat('#d08a62', { fog: false });
  c.b.flat(town); c.b.flat(roof);
  for (let i = 0; i < 26; i++) {
    const x = 380 + R() * 330, w = R.range(8, 20), h = R.range(6, 16), z = 600 + R.range(-6, 6) - 120 * Math.pow(((x - 240) / 660) * 2 - 1, 2) - 2, y = 3 + R() * 9;
    c.b.box(town, w, h, 6, x, y, z);
    if (i % 2) c.b.box(roof, w + 1, 1.6, 7, x, y + h, z);
  }
}
