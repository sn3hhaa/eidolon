/**
 * Post pipeline: scene (HDR, MSAA, depth) → painterly pass (Kuwahara brush
 * filter whose radius grows with defocus + depth ink lines) → portal composite
 * of two scenes → selective bloom (HDR emissives only) → grade / paper / title.
 */
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { NOISE } from './glsl';

export interface Look {
  focus: number;      // focus distance (world units)
  focusRange: number; // distance over which blur reaches full
  dof: number;        // 0..1 defocus amount
  paint: number;      // 0..1 brush filter strength
  ink: number;        // depth-edge ink strength
  bloom: number;      // bloom strength
  exposure: number;
  saturation: number;
  contrast: number;
  vignette: number;
  tint: [number, number, number]; // shadow lift colour
  fade: number;       // 1 = visible, 0 = black
}
export const defaultLook = (): Look => ({
  focus: 12, focusRange: 30, dof: 0.6, paint: 0.7, ink: 0.55, bloom: 0.55, exposure: 1, saturation: 1.12,
  contrast: 1.06, vignette: 0.55, tint: [0.004, 0.006, 0.02], fade: 1,
});
export function mixLook(a: Look, b: Look, k: number): Look {
  const o = { ...a } as any;
  for (const key of Object.keys(a) as (keyof Look)[]) {
    if (key === 'tint') o.tint = a.tint.map((v, i) => v + (b.tint[i] - v) * k);
    else o[key] = (a[key] as number) + ((b[key] as number) - (a[key] as number)) * k;
  }
  return o;
}

export interface PortalState {
  center: THREE.Vector2; // NDC of the portal centre in scene A
  radius: number;        // radius in units of half screen height
  stretch: [number, number];
  depth: number;         // view distance of the portal front (for occlusion); <=0 disables
  rim: THREE.Color;
  rimI: number;
}

const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

function fsMat(frag: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
}

const PAINT_FRAG = /* glsl */ `
uniform sampler2D tColor, tDepth; uniform vec2 uTexel; uniform float uNear, uFar, uFocus, uFocusRange, uDof, uPaint, uInk, uRes;
varying vec2 vUv;
float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return (uNear*uFar)/((uFar-uNear)*d - uFar) * -1.; }
void main(){
  vec3 orig = texture2D(tColor, vUv).rgb;
  float z = viewZ(vUv);
  float coc = clamp(abs(z-uFocus)/uFocusRange, 0., 1.) * uDof;
  float R = mix(1.2, 6.0, coc) * uRes;
  vec3 best = orig; float bestV = 1e9;
  for(int qd=0; qd<4; qd++){
    vec2 sg = vec2(qd==0||qd==3 ? 1.:-1., qd<2 ? 1.:-1.);
    vec3 m = vec3(0.), s2 = vec3(0.);
    for(int j=0;j<3;j++) for(int i=0;i<3;i++){
      vec3 c = texture2D(tColor, vUv + sg*vec2(float(i),float(j))*R*.5*uTexel).rgb;
      c = min(c, vec3(6.)); m += c; s2 += c*c;
    }
    m /= 9.; s2 = abs(s2/9. - m*m); float v = s2.r+s2.g+s2.b;
    if(v < bestV){ bestV = v; best = m; }
  }
  vec3 c = mix(orig, best, clamp(uPaint + coc*.3, 0., 1.));
  // ink: depth discontinuities drawn as soft dark contour
  float zl = viewZ(vUv-vec2(uTexel.x,0.)), zr = viewZ(vUv+vec2(uTexel.x,0.));
  float zu = viewZ(vUv+vec2(0.,uTexel.y)), zd = viewZ(vUv-vec2(0.,uTexel.y));
  float e = max(max(abs(zl-z),abs(zr-z)), max(abs(zu-z),abs(zd-z))) / max(z, .1);
  float edge = smoothstep(.02, .09, e) * (1.-coc*.7);
  c *= 1. - edge*uInk*.75;
  gl_FragColor = vec4(c, 1.);
}`;

const COMP_FRAG = /* glsl */ `
uniform sampler2D tA, tB, tDepthA; uniform vec2 uCenter, uStretch; uniform float uRadius, uAspect, uNear, uFar, uPDepth, uTime, uRimI;
uniform vec3 uRim; varying vec2 vUv;
void main(){
  vec3 a = texture2D(tA, vUv).rgb, b = texture2D(tB, vUv).rgb;
  vec2 p = vUv*2.-1.; p.x *= uAspect; vec2 c = uCenter; c.x *= uAspect;
  vec2 d = (p-c)/uStretch; float ang = atan(d.y,d.x), r = length(d);
  float R = uRadius*(1. + .035*sin(ang*5.+uTime*2.1) + .025*sin(ang*9.-uTime*3.3) + .015*sin(ang*17.+uTime*5.));
  float edge = .012 + R*.05;
  float m = 1.-smoothstep(R-edge, R, r);
  if(uPDepth > 0.){
    float dd = texture2D(tDepthA, vUv).x; float z = (uNear*uFar)/((uFar-uNear)*dd - uFar) * -1.;
    m *= smoothstep(uPDepth*.97, uPDepth, z);
  }
  float ring = exp(-abs(r-R)/(edge*1.6)) * smoothstep(3.5, 1.2, uRadius);
  gl_FragColor = vec4(mix(a,b,m) + uRim*ring*uRimI, 1.);
}`;

const FINAL_FRAG = /* glsl */ `
uniform sampler2D tColor, tTitle; uniform float uExposure, uSat, uContrast, uVig, uFade, uTitleA, uAspect; uniform vec3 uTint;
varying vec2 vUv; ${NOISE}
void main(){
  vec3 c = texture2D(tColor, vUv).rgb * uExposure;
  // hue-preserving shoulder: saturated lights stay coloured instead of clipping to white
  float m = max(c.r, max(c.g, c.b));
  float mt = m < .7 ? m : .7 + .3*tanh((m-.7)/.3*.75);
  c *= mt/max(m,1e-5);
  c = mix(c, vec3(mt), smoothstep(2.5, 9., m)*.55);
  float l = dot(c, vec3(.2126,.7152,.0722));
  c = mix(vec3(l), c, uSat);
  c = pow(max(c,0.), vec3(uContrast));
  c += uTint*(1.-l);
  // canvas tooth + fibre (static, so it reads as a painted surface, not video noise)
  vec2 px = vUv*vec2(1920.,1080.);
  float tooth = vnoise(vec3(px*.55, 1.)) *.6 + vnoise(vec3(px.x*.09, px.y*1.3, 4.))*.4;
  c *= 1. + (tooth-.5)*.085;
  vec2 q = vUv*2.-1.; q.x *= .9;
  c *= 1. - uVig*smoothstep(.55, 1.5, length(q))*.9;
  c = pow(max(c,0.), vec3(1./2.2));
  vec4 t = texture2D(tTitle, vUv);
  c = c*uFade;
  c = mix(c, t.rgb, t.a*uTitleA);
  c += (hash21(px)-.5)/255.;
  gl_FragColor = vec4(c, 1.);
}`;

export class Post {
  rtA: THREE.WebGLRenderTarget; rtB: THREE.WebGLRenderTarget;
  pA: THREE.WebGLRenderTarget; pB: THREE.WebGLRenderTarget; comp: THREE.WebGLRenderTarget;
  bloom: UnrealBloomPass;
  quad: THREE.Mesh; cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); qscene = new THREE.Scene();
  paintMat: THREE.ShaderMaterial; compMat: THREE.ShaderMaterial; finalMat: THREE.ShaderMaterial;
  titleTex: THREE.Texture;

  constructor(public renderer: THREE.WebGLRenderer, public w: number, public h: number, titleCanvas: HTMLCanvasElement) {
    const scene = () => {
      const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
      rt.depthTexture = new THREE.DepthTexture(w, h);
      rt.depthTexture.type = THREE.UnsignedIntType;
      return rt;
    };
    const flat = () => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rtA = scene(); this.rtB = scene(); this.pA = flat(); this.pB = flat(); this.comp = flat();
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.55, 1.0);
    this.bloom.setSize(w, h);
    this.titleTex = new THREE.CanvasTexture(titleCanvas);
    this.titleTex.colorSpace = THREE.NoColorSpace;
    const texel = new THREE.Vector2(1 / w, 1 / h);
    this.paintMat = fsMat(PAINT_FRAG, {
      tColor: { value: null }, tDepth: { value: null }, uTexel: { value: texel }, uNear: { value: 0.1 }, uFar: { value: 100 },
      uFocus: { value: 10 }, uFocusRange: { value: 30 }, uDof: { value: 0.5 }, uPaint: { value: 0.7 }, uInk: { value: 0.5 }, uRes: { value: h / 1080 },
    });
    this.compMat = fsMat(COMP_FRAG, {
      tA: { value: null }, tB: { value: null }, tDepthA: { value: null }, uCenter: { value: new THREE.Vector2() }, uStretch: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: 0 }, uAspect: { value: w / h }, uNear: { value: 0.1 }, uFar: { value: 100 }, uPDepth: { value: 0 }, uTime: { value: 0 },
      uRim: { value: new THREE.Color(1, 1, 1) }, uRimI: { value: 1 },
    });
    this.finalMat = fsMat(FINAL_FRAG, {
      tColor: { value: null }, tTitle: { value: this.titleTex }, uExposure: { value: 1 }, uSat: { value: 1 }, uContrast: { value: 1 }, uVig: { value: 0.5 },
      uFade: { value: 1 }, uTitleA: { value: 0 }, uAspect: { value: w / h }, uTint: { value: new THREE.Vector3() },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.paintMat);
    this.quad.frustumCulled = false;
    this.qscene.add(this.quad);
  }

  private pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.qscene, this.cam);
  }

  /** Render one scene through the painterly pass into pA or pB. */
  drawScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera, look: Look, slot: 'A' | 'B') {
    const rt = slot === 'A' ? this.rtA : this.rtB, out = slot === 'A' ? this.pA : this.pB;
    this.renderer.setRenderTarget(rt);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    const u = this.paintMat.uniforms;
    u.tColor.value = rt.texture; u.tDepth.value = rt.depthTexture; u.uNear.value = camera.near; u.uFar.value = camera.far;
    u.uFocus.value = look.focus; u.uFocusRange.value = look.focusRange; u.uDof.value = look.dof; u.uPaint.value = look.paint; u.uInk.value = look.ink;
    this.pass(this.paintMat, out);
  }

  /** Composite (optional portal), bloom, grade, and present to the canvas. */
  present(look: Look, t: number, portal: PortalState | null, camA: THREE.PerspectiveCamera, titleAlpha: number) {
    let src = this.pA;
    if (portal) {
      const u = this.compMat.uniforms;
      u.tA.value = this.pA.texture; u.tB.value = this.pB.texture; u.tDepthA.value = this.rtA.depthTexture;
      u.uCenter.value.copy(portal.center); u.uRadius.value = portal.radius; u.uStretch.value.set(...portal.stretch);
      u.uNear.value = camA.near; u.uFar.value = camA.far; u.uPDepth.value = portal.depth; u.uTime.value = t;
      u.uRim.value.copy(portal.rim); u.uRimI.value = portal.rimI;
      this.pass(this.compMat, this.comp);
      src = this.comp;
    }
    if (look.bloom > 0.001) {
      this.bloom.strength = look.bloom;
      this.bloom.render(this.renderer, null as any, src, 0, false);
    }
    const f = this.finalMat.uniforms;
    f.tColor.value = src.texture; f.uExposure.value = look.exposure; f.uSat.value = look.saturation; f.uContrast.value = look.contrast;
    f.uVig.value = look.vignette; f.uFade.value = look.fade; f.uTitleA.value = titleAlpha; f.uTint.value.set(...look.tint);
    this.pass(this.finalMat, null);
  }
}
