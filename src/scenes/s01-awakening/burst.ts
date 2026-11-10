import * as THREE from 'three';
import { GLSL_NOISE, GLSL_PALETTE, glsl } from '../../engine/glsl';
import type { Rng } from '../../engine/rng';
import type { AwakeningUniforms } from './uniforms';

/**
 * The celestial light and its explosion.
 *
 *  - core billboard: seed star → ring core → hundreds of needle rays in four
 *    angular layers → shock ring → (at the end) a moon disc.
 *  - 3D streaks: instanced needles radiating in true 3D so the burst has
 *    parallax as the camera moves, plus detached dashes drifting outward
 *    (the reference has loose coloured dashes floating away from the centre).
 */

const GLOW_SIZE = 120;

const GLOW_VERT = glsl`
varying vec2 vP;
void main() {
  vP = position.xy * ${GLOW_SIZE.toFixed(1)};
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * ${GLOW_SIZE.toFixed(1)};
  gl_Position = projectionMatrix * mv;
}
`;

const GLOW_FRAG = glsl`
uniform float uTime;
uniform float uLight;
uniform float uBurst;
uniform float uShock;
uniform float uWarp;
uniform float uCore;
uniform float uMoon;
varying vec2 vP;

${GLSL_NOISE}
${GLSL_PALETTE}

/* One angular layer of needle rays. n = number of angular slots. */
vec3 rays(float a, float r, float n, float seed, float maxLen, float wAbs, float density, float spin) {
  float af = (a / TAU + 0.5) * n + spin;
  float id = mod(floor(af), n);
  float h1 = hash11(id * 1.31 + seed);
  if (h1 > density) return vec3(0.0);
  float h2 = hash11(id * 2.17 + seed + 5.3);
  float h3 = hash11(id * 0.73 + seed + 9.1);
  float f = fract(af) - 0.5 - (h3 - 0.5) * 0.5;      /* jitter inside the slot */

  float grow = clamp(uBurst * 1.4 - h3 * 0.4, 0.0, 1.0);
  grow = 1.0 - pow(1.0 - grow, 2.0);
  float len = maxLen * (0.10 + 0.90 * h2 * h2) * grow * (1.0 + uWarp * 2.5);
  if (r > len || len < 1e-3) return vec3(0.0);

  float u = r / len;                                  /* 0 = centre, 1 = tip */
  float taper = pow(clamp(1.0 - u, 0.0, 1.0), 0.75);
  float dist = abs(f) * (TAU / n) * r;                /* world distance to the needle axis */
  float w = wAbs * (0.45 + 0.9 * h1 / density) * (0.18 + 0.82 * taper);
  float across = 1.0 - smoothstep(w * 0.3, w, dist);

  float flick = 0.78 + 0.22 * sin(uTime * (1.4 + h2 * 4.0) + h1 * 50.0);
  vec3 cA = eidolonAccent(h2 * 0.999);
  vec3 cB = eidolonAccent(h3 * 0.999);
  vec3 c = mix(vec3(1.0, 0.92, 0.72), cA, smoothstep(0.03, 0.28, u));
  c = mix(c, cB, smoothstep(0.5, 0.95, u));
  /* fade the roots so the needles do not pile up into a white blob over the core */
  float root = smoothstep(0.1, 1.6, r);
  return c * across * (0.2 + 0.8 * taper) * flick * (0.12 + 0.88 * root);
}

void main() {
  vec2 p = vP;
  float r = length(p);
  float a = atan(p.y, p.x);
  vec3 col = vec3(0.0);
  float calm = 1.0 - uMoon;                           /* the burst quietens as the moon resolves */

  /* ---- needle rays */
  if (uBurst > 0.0) {
    vec3 rc = vec3(0.0);
    rc += rays(a, r,  40.0,  1.7, 26.0, 0.110, 0.70,  uTime * 0.010) * 1.00;
    rc += rays(a, r,  96.0, 13.1, 15.0, 0.060, 0.62, -uTime * 0.016) * 0.90;
    rc += rays(a, r, 230.0, 27.9,  7.0, 0.032, 0.66,  uTime * 0.030) * 0.80;
    rc += rays(a, r, 460.0, 41.3,  3.2, 0.017, 0.70, -uTime * 0.050) * 0.70;
    /* cap the sum so overlapping needles stay coloured instead of clipping to white */
    col += min(rc, 1.7) * calm * calm;
  }

  /* ---- soft halo */
  /* tight: space must stay black right up to the light */
  /* measured from the rim of the core so it hugs the disc at any size —
     a halo scaled by the core radius floods the frame once the camera is close */
  float hw = 0.22 + uBurst * 0.95 * calm + uCore * 0.3;
  float halo = 1.0 / (1.0 + pow(max(r - uCore, 0.0) / hw, 3.2));
  col += vec3(1.0, 0.74, 0.40) * halo * min(uLight, 1.2) * 0.42 * (0.25 + 0.75 * calm);

  /* ---- seed-star glint (before the burst the light is a tiny four-point star) */
  float gl = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 1.3) + exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 1.3);
  col += vec3(1.0, 0.95, 0.85) * gl * uLight * 2.2 * (1.0 - smoothstep(0.0, 0.6, uBurst));

  /* ---- shock ring */
  /* a thin, broken ring of light racing outward — a hint, not a rainbow hoop */
  float sr = uShock * 46.0;
  float ringW = 0.05 + uShock * 0.35;
  float sx = (r - sr) / ringW;
  float gaps = smoothstep(0.42, 0.62, vnoise(vec2(a * 9.0, 3.7)));
  float shock = exp(-sx * sx) * pow(1.0 - uShock, 3.0) * step(0.001, uShock) * gaps;
  col += mix(vec3(1.0, 0.9, 0.7), eidolonAccent(a / TAU + 0.5), 0.6) * shock * 0.5;

  /* ---- core: ring → disc → moon */
  float rc0 = max(uCore, 1e-4);
  float aaR = fwidth(r) * 1.5;
  float disc = 1.0 - smoothstep(rc0 - aaR, rc0 + aaR, r);
  float rx = (r - rc0) / (rc0 * 0.14 + 0.003);
  float ring = exp(-rx * rx);
  vec2 mp = p / rc0;
  float maria = fbm(mp * 1.9 + 4.2);
  float pits = worley(mp * 4.5 + 1.3);
  /* kept below the bloom threshold and under the tone shoulder: a moon that is
     HDR-bright clips to a blank white disc and loses its face */
  vec3 moon = vec3(1.0, 0.965, 0.850) * (0.93 + 0.26 * (maria - 0.45));
  moon = mix(moon, vec3(0.44, 0.50, 0.66), smoothstep(0.50, 0.64, maria) * 0.6);
  moon *= 0.9 + 0.1 * smoothstep(0.08, 0.3, pits);
  moon *= 1.0 - 0.22 * pow(clamp(r / rc0, 0.0, 1.0), 5.0);
  vec3 heart = mix(vec3(1.0, 0.50, 0.10), vec3(1.0, 0.95, 0.82), 1.0 - smoothstep(0.2, 0.9, r / rc0));
  /* As the moon resolves it becomes a solid body: 'cover' is written to alpha
     and the material blends (ONE, ONE_MINUS_SRC_ALPHA), so the disc occludes
     what is behind it while everything else stays purely additive. */
  float cover = disc * smoothstep(0.0, 0.7, uMoon);
  col *= 1.0 - cover;
  col += disc * mix(heart * 1.5, moon * 1.02, uMoon);
  col += ring * vec3(1.0, 0.97, 0.90) * 1.8 * (1.0 - uMoon * 0.85) * step(0.0005, uCore);

  gl_FragColor = vec4(col, cover);
}
`;

const STREAK_VERT = glsl`
attribute vec3 aDir;
attribute vec4 aShape;   /* start radius, length, width, delay */
attribute vec4 aMotion;  /* kind (0 ray, 1 dash), drift speed, warp gain, phase */
attribute vec3 aColA;
attribute vec3 aColB;
uniform float uTime;
uniform float uBurst;
uniform float uBurstAge;
uniform float uWarp;
uniform float uMoon;
varying vec2 vUv;
varying vec3 vColA;
varying vec3 vColB;
varying float vKind;
varying float vGain;

void main() {
  float kind = aMotion.x;
  float g = clamp(uBurst * 1.45 - aShape.w * 0.45, 0.0, 1.0);
  g = 1.0 - pow(1.0 - g, 3.0);
  float age = max(uBurstAge, 0.0);
  float start = aShape.x * g + kind * age * aMotion.y;
  float len = aShape.y * g * (1.0 + uWarp * aMotion.z);
  vec3 wp = aDir * (start + len * position.x);
  vec3 toCam = normalize(cameraPosition - wp);
  vec3 side = normalize(cross(aDir, toCam) + 1e-5);
  wp += side * position.y * aShape.z * (1.0 + uWarp * 0.6);

  vUv = vec2(position.x, position.y * 2.0);
  vColA = aColA;
  vColB = aColB;
  vKind = kind;
  vGain = g * (0.8 + 0.2 * sin(uTime * (1.0 + aMotion.w * 3.0) + aMotion.w * 40.0)) * (1.0 - uMoon);
  /* needles that pass right by the lens would smear across the whole frame */
  vGain *= smoothstep(0.8, 7.0, distance(cameraPosition, wp));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const STREAK_FRAG = glsl`
varying vec2 vUv;
varying vec3 vColA;
varying vec3 vColB;
varying float vKind;
varying float vGain;
void main() {
  float u = clamp(vUv.x, 0.0, 1.0);
  float v = min(abs(vUv.y), 1.0);
  /* rays: bright at the root, needle-pointed tip. dashes: spindle. */
  float along = mix(pow(1.0 - u, 1.3) * smoothstep(0.0, 0.12, u), sin(u * 3.14159), vKind);
  float halfW = mix(0.25 + 0.75 * (1.0 - u), sin(u * 3.14159), vKind);
  float across = 1.0 - smoothstep(halfW * 0.25, halfW, v);
  vec3 c = mix(vColA, vColB, smoothstep(0.25, 0.9, u));
  c = mix(vec3(1.0, 0.94, 0.80), c, mix(smoothstep(0.0, 0.22, u), 1.0, vKind));
  gl_FragColor = vec4(c * along * across * vGain * 0.8, 1.0);
}
`;

const ACCENTS: [number, number, number][] = [
  [1.0, 0.42, 0.04], // orange
  [1.0, 0.8, 0.16], // amber
  [1.0, 0.12, 0.5], // magenta
  [0.08, 0.8, 1.0], // cyan
  [0.5, 1.0, 0.18], // acid green
  [0.52, 0.26, 1.0], // violet
  [1.0, 0.96, 0.86], // cream
];

export function createGlow(u: AwakeningUniforms): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: u.uTime,
      uLight: u.uLight,
      uBurst: u.uBurst,
      uShock: u.uShock,
      uWarp: u.uWarp,
      uCore: u.uCore,
      uMoon: u.uMoon,
    },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    transparent: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  return mesh;
}

export function createStreaks(rng: Rng, u: AwakeningUniforms): THREE.Mesh {
  const RAYS = 300;
  const DASHES = 170;
  const n = RAYS + DASHES;
  const aDir = new Float32Array(n * 3);
  const aShape = new Float32Array(n * 4);
  const aMotion = new Float32Array(n * 4);
  const aColA = new Float32Array(n * 3);
  const aColB = new Float32Array(n * 3);

  for (let i = 0; i < n; i++) {
    const dash = i >= RAYS;
    // bias directions toward the picture plane so most needles read as radial
    let [x, y, z] = rng.onSphere();
    z *= 0.55;
    const l = Math.hypot(x, y, z);
    aDir.set([x / l, y / l, z / l], i * 3);
    if (dash) {
      const len = rng.range(0.5, 2.6);
      aShape.set([rng.range(6, 34), len, rng.range(0.05, 0.16), rng.next()], i * 4);
      aMotion.set([1, rng.range(0.25, 1.1), rng.range(2, 7), rng.next()], i * 4);
    } else {
      const long = rng.next();
      const len = 2.5 + long * long * 24;
      aShape.set([rng.range(0.0, 0.5), len, rng.range(0.035, 0.11) * (0.7 + long), rng.next()], i * 4);
      aMotion.set([0, 0, rng.range(1.5, 5), rng.next()], i * 4);
    }
    aColA.set(rng.pick(ACCENTS), i * 3);
    aColB.set(rng.pick(ACCENTS), i * 3);
  }

  // unit strip along +x, centred on y
  const base = new THREE.PlaneGeometry(1, 1, 1, 1);
  base.translate(0.5, 0, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('aDir', new THREE.InstancedBufferAttribute(aDir, 3));
  geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(aShape, 4));
  geo.setAttribute('aMotion', new THREE.InstancedBufferAttribute(aMotion, 4));
  geo.setAttribute('aColA', new THREE.InstancedBufferAttribute(aColA, 3));
  geo.setAttribute('aColB', new THREE.InstancedBufferAttribute(aColB, 3));
  geo.instanceCount = n;

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: u.uTime,
      uBurst: u.uBurst,
      uBurstAge: u.uBurstAge,
      uWarp: u.uWarp,
      uMoon: u.uMoon,
    },
    vertexShader: STREAK_VERT,
    fragmentShader: STREAK_FRAG,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 11;
  return mesh;
}
