import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { glsl } from './glsl';
import type { SceneLook, TransitionKind } from './types';

const VERT = glsl`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Combines the outgoing and incoming scene images during a transition. */
const CompositeShader = {
  uniforms: {
    tA: { value: null as THREE.Texture | null },
    tB: { value: null as THREE.Texture | null },
    uMix: { value: 0 },
    uKind: { value: 0 },
  },
  vertexShader: VERT,
  fragmentShader: glsl`
    uniform sampler2D tA;
    uniform sampler2D tB;
    uniform float uMix;
    uniform int uKind;
    varying vec2 vUv;
    void main() {
      vec3 a = texture2D(tA, vUv).rgb;
      if (uMix <= 0.0) { gl_FragColor = vec4(a, 1.0); return; }
      vec3 b = texture2D(tB, vUv).rgb;
      float m = uMix;
      if (uKind == 1) {
        /* luma dissolve: the incoming image arrives through the brightest
           parts of the outgoing one, so light sources "become" the next scene */
        float l = clamp(dot(a, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
        m = smoothstep(0.0, 1.0, uMix * 1.6 - (1.0 - l) * 0.6);
      }
      gl_FragColor = vec4(mix(a, b, m), 1.0);
    }
  `,
};

/**
 * Kuwahara filter — flattens the image into soft-edged dabs of colour, which
 * is what gives rendered geometry the gouache / painted-cel feel of the
 * reference artwork. Variance is measured on compressed values so HDR
 * highlights do not dominate region selection.
 */
const KuwaharaShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1920, 1080) },
    uRadius: { value: 3 },
    uMix: { value: 1 },
  },
  vertexShader: VERT,
  fragmentShader: glsl`
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uRadius;
    uniform float uMix;
    varying vec2 vUv;
    #define MAXR 6
    void main() {
      vec3 src = texture2D(tDiffuse, vUv).rgb;
      int r = int(clamp(ceil(uRadius), 1.0, float(MAXR)));
      vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
      vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
      vec3 q0 = vec3(0.0), q1 = vec3(0.0), q2 = vec3(0.0), q3 = vec3(0.0);
      for (int j = -MAXR; j <= MAXR; j++) {
        for (int i = -MAXR; i <= MAXR; i++) {
          if (i < -r || i > r || j < -r || j > r) continue;
          vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) / uRes).rgb;
          vec3 k = c / (1.0 + c);
          if (i <= 0 && j <= 0) { m0 += c; s0 += k; q0 += k * k; }
          if (i >= 0 && j <= 0) { m1 += c; s1 += k; q1 += k * k; }
          if (i <= 0 && j >= 0) { m2 += c; s2 += k; q2 += k * k; }
          if (i >= 0 && j >= 0) { m3 += c; s3 += k; q3 += k * k; }
        }
      }
      float n = float((r + 1) * (r + 1));
      vec3 v0 = abs(q0 / n - (s0 / n) * (s0 / n));
      vec3 v1 = abs(q1 / n - (s1 / n) * (s1 / n));
      vec3 v2 = abs(q2 / n - (s2 / n) * (s2 / n));
      vec3 v3 = abs(q3 / n - (s3 / n) * (s3 / n));
      float e0 = v0.r + v0.g + v0.b;
      float e1 = v1.r + v1.g + v1.b;
      float e2 = v2.r + v2.g + v2.b;
      float e3 = v3.r + v3.g + v3.b;
      vec3 best = m0 / n;
      float e = e0;
      if (e1 < e) { e = e1; best = m1 / n; }
      if (e2 < e) { e = e2; best = m2 / n; }
      if (e3 < e) { e = e3; best = m3 / n; }
      gl_FragColor = vec4(mix(src, best, uMix), 1.0);
    }
  `,
};

/** Final grade: aberration, tone curve, saturation, vignette, paper tooth, grain, sRGB. */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1920, 1080) },
    uFrame: { value: 0 },
    uExposure: { value: 1 },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.03 },
    uAberration: { value: 0 },
  },
  vertexShader: VERT,
  fragmentShader: glsl`
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uFrame;
    uniform float uExposure;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    varying vec2 vUv;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    float vn(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    /* linear up to 'a', then a smooth shoulder to 1 — keeps mid-tone colour
       relationships exact and only rolls off the highlights */
    vec3 shoulder(vec3 x) {
      const float a = 0.62;
      vec3 hi = a + (1.0 - a) * (1.0 - exp(-(x - a) / (1.0 - a)));
      return mix(x, hi, step(a, x));
    }
    vec3 toSRGB(vec3 c) {
      c = clamp(c, 0.0, 1.0);
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * uAberration;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv - off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv + off).b;

      col = max(col, 0.0) * uExposure;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = max(mix(vec3(l), col, uSaturation), 0.0);
      col = shoulder(col);

      float aspect = uRes.x / uRes.y;
      float v = length(c * vec2(1.0, 1.0 / aspect) * vec2(1.0, aspect * 0.9));
      col *= 1.0 - uVignette * smoothstep(0.32, 0.92, v);

      col = toSRGB(col);
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

      /* paper tooth: static, sits on the "print"; only visible where there is ink */
      vec2 px = vUv * uRes * (1080.0 / uRes.y);
      float tooth = vn(px * 0.55) * 0.6 + vn(px * 1.3) * 0.4;
      col *= 1.0 + (tooth - 0.5) * uGrain * 1.6;

      /* film grain: re-seeded per frame, triangular distribution */
      vec2 gp = gl_FragCoord.xy + vec2(uFrame * 17.0, uFrame * 31.0);
      float g = hash(gp) + hash(gp + 71.7) - 1.0;
      col += g * uGrain * (0.35 + 0.65 * smoothstep(0.0, 0.25, dot(col, vec3(0.333))));

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export interface PostFrame {
  texA: THREE.Texture;
  texB: THREE.Texture | null;
  mix: number;
  kind: TransitionKind;
  look: SceneLook;
  frame: number;
}

export class PostPipeline {
  private readonly composer: EffectComposer;
  private readonly composite: ShaderPass;
  private readonly kuwahara: ShaderPass;
  private readonly bloom: UnrealBloomPass;
  private readonly finish: ShaderPass;
  private height: number;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.height = height;
    const rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });
    this.composer = new EffectComposer(renderer, rt);
    this.composite = new ShaderPass(CompositeShader);
    this.kuwahara = new ShaderPass(KuwaharaShader);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.4, 0.6, 0.85);
    this.finish = new ShaderPass(FinishShader);
    this.composer.addPass(this.composite);
    this.composer.addPass(this.kuwahara);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.finish);
    this.setSize(width, height);
  }

  setSize(width: number, height: number): void {
    this.height = height;
    this.composer.setSize(width, height);
    this.kuwahara.uniforms.uRes.value.set(width, height);
    this.finish.uniforms.uRes.value.set(width, height);
  }

  render(f: PostFrame): void {
    const { look } = f;
    const cu = this.composite.uniforms;
    cu.tA.value = f.texA;
    cu.tB.value = f.texB ?? f.texA;
    cu.uMix.value = f.texB ? f.mix : 0;
    cu.uKind.value = f.kind === 'luma' ? 1 : 0;

    const resScale = this.height / 1080;
    const radius = look.painterly * resScale;
    this.kuwahara.enabled = radius >= 0.5 && look.painterlyMix > 0.001;
    this.kuwahara.uniforms.uRadius.value = radius;
    this.kuwahara.uniforms.uMix.value = look.painterlyMix;

    this.bloom.enabled = look.bloomStrength > 0.001;
    this.bloom.strength = look.bloomStrength;
    this.bloom.radius = look.bloomRadius;
    this.bloom.threshold = look.bloomThreshold;

    const fu = this.finish.uniforms;
    fu.uFrame.value = f.frame;
    fu.uExposure.value = look.exposure;
    fu.uSaturation.value = look.saturation;
    fu.uContrast.value = look.contrast;
    fu.uVignette.value = look.vignette;
    fu.uGrain.value = look.grain;
    fu.uAberration.value = look.aberration;

    this.composer.render();
  }
}
