import * as THREE from 'three';
import { GLSL_NOISE, glsl } from '../../engine/glsl';
import type { Rng } from '../../engine/rng';
import type { AwakeningUniforms } from './uniforms';

/**
 * The "fragments": torn, painted islands of deep navy with impasto cloud-foam
 * rims, suspended in black space around the light (reference: the cosmic
 * explosion painting). Each is an instanced quad whose silhouette, brushwork
 * and foam rim are generated in the fragment shader. They hold no light of
 * their own — everything visible on them is the central light catching their
 * edges, so in the opening darkness they are invisible.
 *
 * kind 0 = navy fragment / continent, kind 1 = pale "moonstone" ovoid.
 */

const VERT = glsl`
attribute vec3 iPos;
attribute vec4 iXform;  /* sx, sy, rotation, push weight */
attribute vec4 iStyle;  /* seed, kind, noise frequency, elongation */
uniform float uTime;
uniform float uPush;
varying vec2 vUv;
varying vec4 vStyle;
varying vec3 vWorld;
varying vec2 vRot;

void main() {
  vUv = position.xy * 2.0;
  vStyle = iStyle;
  float ph = iStyle.x * 61.7;
  float a = iXform.z + uTime * 0.014 * sin(ph * 3.1);
  float c = cos(a);
  float s = sin(a);
  vec2 pr = mat2(c, s, -s, c) * (position.xy * iXform.xy);
  vRot = vec2(c, s);

  vec3 center = iPos;
  center.xy += vec2(sin(uTime * 0.11 + ph), cos(uTime * 0.09 + ph * 1.7)) * 0.4;
  /* the burst shoves every fragment outward from the light */
  vec3 radial = normalize(vec3(iPos.xy, iPos.z * 0.35) + 1e-4);
  center += radial * uPush * iXform.w;

  vec3 wp = center + vec3(pr, 0.0);
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const FRAG = glsl`
uniform float uTime;
uniform float uLight;
uniform float uBurst;
varying vec2 vUv;
varying vec4 vStyle;
varying vec3 vWorld;
varying vec2 vRot;

${GLSL_NOISE}

const vec3 NAVY_DARK = vec3(0.006, 0.010, 0.032);
const vec3 NAVY      = vec3(0.014, 0.034, 0.115);
const vec3 COBALT    = vec3(0.034, 0.100, 0.320);
const vec3 CREAM     = vec3(0.960, 0.905, 0.760);
const vec3 GOLD      = vec3(1.000, 0.600, 0.100);
const vec3 EMBER     = vec3(0.950, 0.260, 0.040);
const vec3 SHADE     = vec3(0.085, 0.120, 0.250);

void main() {
  float seed = vStyle.x;
  float kind = vStyle.y;
  float freq = vStyle.z;
  float elong = vStyle.w;

  vec2 p = vUv;
  vec2 q = p * freq + seed * vec2(17.31, 9.73);

  /* ---- silhouette: domain-warped noise island */
  vec2 w = vec2(fbm(q * 1.2 + 3.1), fbm(q * 1.2 + 7.7)) - 0.5;
  float n = fbm(q * 0.8 + w * 1.8);
  float amp = mix(1.1, 0.16, kind);
  float r = length(p * vec2(1.0, elong));
  float m0 = 0.55 - (r + (n - 0.5) * amp);          /* > 0 inside */
  float fine = (fbm(q * 5.0 + w) - 0.5) * mix(0.11, 0.02, kind);
  float m = min(m0 - fine, (1.0 - max(abs(p.x), abs(p.y))) * 2.0);
  float aa = fwidth(m) + 1e-4;
  float alpha = smoothstep(-aa, aa, m);
  if (alpha < 0.004) discard;

  /* ---- which way does this bit of coastline face, relative to the light?
     Analytic gradient of the silhouette field (finite differences on the
     noise). Screen-space dFdx/dFdy would be cheaper but is evaluated per
     2x2 pixel quad and makes the rim lighting visibly blocky. */
  vec2 na = q * 0.8 + w * 1.8;
  const float E = 0.06;
  vec2 gn = vec2(fbm(na + vec2(E, 0.0)) - n, fbm(na + vec2(0.0, E)) - n) / E * (0.8 * freq);
  vec2 gr = p * vec2(1.0, elong * elong) / max(r, 1e-4);
  vec2 outLocal = gr + gn * amp;
  outLocal /= length(outLocal) + 1e-6;
  vec2 outward = mat2(vRot.x, vRot.y, -vRot.y, vRot.x) * outLocal;   /* world xy */
  vec2 L = -vWorld.xy / (length(vWorld.xy) + 1e-4);                   /* toward the light */
  float facing = clamp(dot(outward, L) * 0.5 + 0.5, 0.0, 1.0);        /* 1 = this edge faces the light */

  float dist = length(vWorld);
  float att = uLight / (1.0 + dist * dist * 0.0032);
  float behind = 1.0 - smoothstep(-9.0, 5.0, vWorld.z);   /* 1 = behind the light: front-lit */

  /* ---- interior: broad wet gouache washes stepped into a few flat tones */
  float ang = fbm(q * 0.35 + 20.0) * TAU;
  vec2 sq = rot2(ang) * q;
  float wash = fbm(sq * vec2(0.7, 2.6) + w * 0.6);
  float tone = wash * 0.7 + n * 0.3;
  float bristle = fbm(sq * vec2(2.0, 26.0));                            /* dry-brush streaks */
  /* no hard quantisation here: stepped bands read as contour lines, not paint.
     the bristle noise breaks the wash edges up the way a loaded brush does */
  float dab = smoothstep(0.30, 0.72, tone + (bristle - 0.5) * 0.22);
  vec3 inner = mix(NAVY_DARK, NAVY, dab);
  inner = mix(inner, COBALT, smoothstep(0.56, 0.84, tone + (bristle - 0.5) * 0.3) * 0.5);
  inner *= 0.90 + 0.20 * bristle;
  float innerLight = (0.03 + 0.97 * behind) * att;
  vec3 col = inner * 3.6 * innerLight / (1.0 + innerLight * 2.0);
  /* warm bounce from the burst on the side that sees it */
  col += GOLD * 0.035 * att * behind * pow(facing, 3.0) * uBurst;

  /* ---- moonstone variant: pale, mottled, cel-shaded ovoid */
  float crater = worley(q * 3.2 + w * 0.8);
  float mott = fbm(q * 2.4 + w * 1.2);
  vec3 stone = mix(vec3(0.50, 0.52, 0.58), CREAM, smoothstep(0.3, 0.7, mott));
  stone = mix(stone, vec3(0.30, 0.33, 0.42), (1.0 - smoothstep(0.08, 0.22, crater)) * 0.6);
  float stoneLight = 0.55 + 0.55 * smoothstep(0.15, 0.95, facing);
  vec3 stoneCol = stone * stoneLight * 3.2 * att / (1.0 + att);
  col = mix(col, stoneCol, kind);

  /* ---- foam rim: lumpy impasto cloud bank, lit gold on the side facing the burst */
  float bandW = 0.10 + 0.21 * vnoise(q * 1.3 + 11.0);
  float edge = 1.0 - smoothstep(0.0, bandW, m);
  float lump = smoothstep(0.2, 0.85, 1.0 - worley(q * 3.6 + w * 1.6));
  float lump2 = smoothstep(0.3, 0.9, 1.0 - worley(q * 8.5 + 3.0));
  float foamAmt = smoothstep(0.34, 0.46, edge * (0.5 + 0.5 * lump));
  float warm = clamp(uBurst * 1.5 / (1.0 + dist * 0.07), 0.0, 1.0);
  float rimLight = pow(facing, 2.4);
  /* cel-step the foam shading so it reads as dabs of thick paint */
  float body = 0.30 + 0.45 * lump + 0.30 * lump2;
  body = floor(body * 5.0 + 0.5) / 5.0;
  /* moonlit ramp: slate → pale grey → cream.  burst-lit ramp: burnt orange → gold → hot cream */
  vec3 cool = mix(vec3(0.15, 0.21, 0.42), vec3(0.70, 0.72, 0.80), smoothstep(0.2, 0.6, body));
  cool = mix(cool, vec3(1.0, 0.97, 0.88), smoothstep(0.55, 0.9, body));
  vec3 hot = mix(vec3(0.50, 0.11, 0.02), GOLD, smoothstep(0.2, 0.6, body));
  hot = mix(hot, vec3(1.0, 0.90, 0.58), smoothstep(0.6, 0.95, body));
  hot = mix(hot, EMBER, (1.0 - lump) * 0.3);
  vec3 lit = mix(cool, hot, warm);
  vec3 foam = mix(SHADE * (0.25 + 0.5 * body), lit, rimLight);
  /* a thin bright lip right on the silhouette */
  foam += mix(CREAM, vec3(1.0, 0.86, 0.5), warm) * rimLight * (1.0 - smoothstep(0.0, 0.018, m)) * 0.5;
  float rimI = att * 2.7 / (1.0 + att * 1.5) * (1.0 + warm * 0.9);
  /* the burst's light soaks a little way into the fragment from its lit edge */
  float soak = exp(-max(m, 0.0) * 7.0) * rimLight * warm * (1.0 - kind);
  col += vec3(0.95, 0.34, 0.05) * soak * rimI * 0.55;
  col = mix(col, foam * rimI, foamAmt * (1.0 - kind));

  gl_FragColor = vec4(max(col, 0.0), alpha);
}
`;

interface ShardSpec {
  pos: [number, number, number];
  sx: number;
  sy: number;
  rot: number;
  push: number;
  seed: number;
  kind: number;
  freq: number;
  elong: number;
}

function layout(rng: Rng): ShardSpec[] {
  const out: ShardSpec[] = [];
  const add = (z: number, rho: number, size: number, kind: number, freq: number) => {
    const theta = rng.range(0, Math.PI * 2);
    const stretch = rng.range(0.85, 1.6);
    out.push({
      pos: [Math.cos(theta) * rho, Math.sin(theta) * rho * 0.82, z],
      sx: size * stretch,
      sy: size,
      rot: rng.range(-Math.PI, Math.PI),
      push: rng.range(0.6, 1.6) * (kind === 1 ? 1.3 : 1) * (4 / (4 + size * 0.25)),
      seed: rng.range(0.1, 9.9),
      kind,
      freq,
      elong: kind === 1 ? rng.range(1.15, 1.5) : rng.range(1.0, 1.25),
    });
  };

  // far continents — huge, front-lit, form the navy "oceans" of the backdrop
  for (let i = 0; i < 6; i++) {
    const size = rng.range(36, 68);
    add(rng.range(-78, -34), size * rng.range(0.42, 0.9), size, 0, rng.range(2.2, 3.4));
  }
  // mid ring — surrounds the light, catches the strongest rim light
  for (let i = 0; i < 22; i++) {
    const size = rng.range(5, 17);
    add(rng.range(-24, 12), 3.2 + size * 0.34 + rng.range(0, 21), size, 0, rng.range(1.4, 2.4));
  }
  // moonstones — pale cratered ovoids drifting among the fragments
  for (let i = 0; i < 5; i++) {
    const size = rng.range(2.4, 5.5);
    add(rng.range(-20, 4), rng.range(7, 24), size, 1, rng.range(1.2, 1.9));
  }
  // near silhouettes — backlit shapes the camera flies between
  for (let i = 0; i < 15; i++) {
    const size = rng.range(4, 12);
    add(rng.range(13, 41), 4.6 + size * 0.36 + rng.range(0, 13), size, 0, rng.range(1.3, 2.1));
  }
  return out;
}

export function createShards(rng: Rng, u: AwakeningUniforms): THREE.Mesh {
  const specs = layout(rng);
  const n = specs.length;
  const iPos = new Float32Array(n * 3);
  const iXform = new Float32Array(n * 4);
  const iStyle = new Float32Array(n * 4);
  specs.forEach((s, i) => {
    iPos.set(s.pos, i * 3);
    iXform.set([s.sx, s.sy, s.rot, s.push], i * 4);
    iStyle.set([s.seed, s.kind, s.freq, s.elong], i * 4);
  });

  const plane = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = plane.index;
  geo.setAttribute('position', plane.getAttribute('position'));
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 3));
  geo.setAttribute('iXform', new THREE.InstancedBufferAttribute(iXform, 4));
  geo.setAttribute('iStyle', new THREE.InstancedBufferAttribute(iStyle, 4));
  geo.instanceCount = n;

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: u.uTime,
      uLight: u.uLight,
      uBurst: u.uBurst,
      uPush: u.uPush,
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  return mesh;
}
