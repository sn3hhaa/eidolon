import * as THREE from 'three';
import { GLSL_NOISE, glsl } from '../../engine/glsl';
import type { Rng } from '../../engine/rng';
import type { AwakeningUniforms } from './uniforms';

/**
 * Sparkles, dust and embers. All motion is closed-form in the vertex shader
 * (a function of uTime / uBurstAge), so any frame can be drawn in isolation.
 *
 *  - sparkles: the small cross-shaped "+" stars of the reference, in pink,
 *    cyan, amber and cream. They are revealed by a sphere of light expanding
 *    from the centre rather than simply fading in.
 *  - dust: tiny round motes filling the volume.
 *  - embers: hot particles thrown out by the burst on decelerating paths.
 */

const SPARK_VERT = glsl`
attribute vec4 aSeed;   /* phase, size (world units), shape (0 round, 1 cross), speed */
attribute vec3 aColor;
uniform float uTime;
uniform float uReveal;
uniform float uPush;
uniform float uPx;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;

void main() {
  vec3 p = position;
  float d = length(p);
  vec3 dir = p / max(d, 1e-4);
  p += dir * uPush * (0.5 + aSeed.w) * 6.0 / (1.0 + d * 0.05);
  float ph = aSeed.x * 6.2831853;
  p.xy += vec2(sin(uTime * 0.21 * (0.5 + aSeed.w) + ph), cos(uTime * 0.17 * (0.5 + aSeed.w) + ph * 1.3)) * 0.35;

  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float vis = smoothstep(0.0, 7.0, uReveal - d);
  float tw = 0.5 + 0.5 * sin(uTime * (1.2 + aSeed.w * 3.5) + ph);
  tw = mix(0.75 + 0.25 * tw, tw * tw, aSeed.z);       /* crosses twinkle hard, dust barely */
  float nearFade = smoothstep(1.0, 6.0, -mv.z);
  vAlpha = vis * tw * nearFade;
  vColor = aColor;
  vShape = aSeed.z;
  gl_PointSize = max(aSeed.y * uPx / max(-mv.z, 0.1), 1.0);
}
`;

const SPARK_FRAG = glsl`
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float ax = abs(c.x);
  float ay = abs(c.y);
  float core = exp(-dot(c, c) * mix(5.0, 22.0, vShape));
  float cross = exp(-ax * 20.0) * exp(-ay * 2.6) + exp(-ay * 20.0) * exp(-ax * 2.6);
  float a = mix(core, core * 0.9 + cross, vShape);
  a *= 1.0 - smoothstep(0.75, 1.0, max(ax, ay));
  gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
}
`;

const EMBER_VERT = glsl`
attribute vec3 aDir;
attribute vec4 aP;      /* speed, delay, size, hue seed */
attribute vec3 aColor;
uniform float uBurstAge;
uniform float uMoon;
uniform float uPx;
varying vec3 vColor;
varying float vAlpha;

${GLSL_NOISE}

void main() {
  float age = uBurstAge - aP.y;
  if (age <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vColor = vec3(0.0);
    return;
  }
  /* thrown out fast, then coasting */
  float travel = aP.x * (15.0 * (1.0 - exp(-age * 1.5)) + age * 0.9);
  vec3 p = aDir * travel;
  p.xy = rot2(age * 0.07 * (aP.w - 0.5)) * p.xy;
  p += vec3(sin(age * 1.3 + aP.w * 40.0), cos(age * 1.1 + aP.w * 23.0), 0.0) * 0.12 * age;

  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float flick = 0.7 + 0.3 * sin(age * (6.0 + aP.w * 9.0) + aP.w * 60.0);
  /* embers fade as they near the lens (no giant bokeh blobs) and as the moon resolves */
  vAlpha = smoothstep(0.0, 0.12, age) * (0.3 + 0.7 * exp(-age * 0.45)) * flick
         * smoothstep(1.5, 7.0, -mv.z) * (1.0 - uMoon * 0.85);
  vColor = mix(vec3(1.0, 0.95, 0.8), aColor, smoothstep(0.0, 0.5, age));
  gl_PointSize = clamp(aP.z * uPx / max(-mv.z, 0.1), 1.0, 26.0 * uPx / 1500.0);
}
`;

const EMBER_FRAG = glsl`
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(c, c) * 7.0) * (1.0 - smoothstep(0.8, 1.0, length(c)));
  gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
}
`;

const SPARK_COLORS: [number, number, number][] = [
  [1.0, 0.36, 0.72], // pink
  [0.3, 0.86, 1.0], // cyan
  [1.0, 0.82, 0.3], // amber
  [1.0, 0.96, 0.88], // cream
  [1.0, 0.36, 0.72],
  [0.62, 0.42, 1.0], // violet
];
const EMBER_COLORS: [number, number, number][] = [
  [1.0, 0.45, 0.06],
  [1.0, 0.78, 0.2],
  [1.0, 0.16, 0.48],
  [0.2, 0.82, 1.0],
  [0.56, 1.0, 0.24],
  [1.0, 0.45, 0.06],
];

function additivePoints(geo: THREE.BufferGeometry, mat: THREE.ShaderMaterial, order: number): THREE.Points {
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.transparent = true;
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = order;
  return pts;
}

export function createSparkles(rng: Rng, u: AwakeningUniforms): THREE.Points {
  const CROSSES = 520;
  const DUST = 4200;
  const n = CROSSES + DUST;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const cross = i < CROSSES;
    const theta = rng.range(0, Math.PI * 2);
    const rho = 2.5 + Math.pow(rng.next(), 0.7) * (cross ? 40 : 52);
    pos.set([Math.cos(theta) * rho, Math.sin(theta) * rho * 0.8, rng.range(-55, 44)], i * 3);
    const size = cross ? rng.range(0.35, 1.25) : rng.range(0.035, 0.12);
    seed.set([rng.next(), size, cross ? 1 : 0, rng.next()], i * 4);
    const c = rng.pick(SPARK_COLORS);
    const k = cross ? 1.6 : rng.range(0.35, 1.0);
    col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: u.uTime, uReveal: u.uReveal, uPush: u.uPush, uPx: u.uPx },
    vertexShader: SPARK_VERT,
    fragmentShader: SPARK_FRAG,
  });
  return additivePoints(geo, mat, 12);
}

export function createEmbers(rng: Rng, u: AwakeningUniforms): THREE.Points {
  const n = 2600;
  const pos = new Float32Array(n * 3); // unused by the shader, required by three
  const dir = new Float32Array(n * 3);
  const p = new Float32Array(n * 4);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let [x, y, z] = rng.onSphere();
    z *= 0.7;
    const l = Math.hypot(x, y, z);
    dir.set([x / l, y / l, z / l], i * 3);
    const speed = 0.15 + Math.pow(rng.next(), 1.8) * 1.9;
    p.set([speed, rng.range(0, 0.9) * rng.next(), rng.range(0.05, 0.22), rng.next()], i * 4);
    col.set(rng.pick(EMBER_COLORS), i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aP', new THREE.BufferAttribute(p, 4));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uBurstAge: u.uBurstAge, uMoon: u.uMoon, uPx: u.uPx },
    vertexShader: EMBER_VERT,
    fragmentShader: EMBER_FRAG,
  });
  return additivePoints(geo, mat, 13);
}
