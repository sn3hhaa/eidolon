/**
 * Post: scene (HDR, MSAA, depth) → ink pass (contour lines from depth + flat-colour
 * boundaries) accumulated over N sub-frames for real motion blur → grade, vignette,
 * overlay (titles / flashes) → canvas.
 */
import * as THREE from 'three';

export interface Look { ink: number; inkWidth: number; exposure: number; saturation: number; contrast: number; vignette: number; fade: number; warmth: number; desat: number; flash: number; /** 0..1 "time is stopped" grade */ freeze: number; /** radius (m) of the freeze wave expanding from pulseO; < 0 = off */ pulseR: number; pulseO: THREE.Vector3 }
export const defaultLook = (): Look => ({ ink: 0.85, inkWidth: 1.3, exposure: 1, saturation: 1.12, contrast: 1.08, vignette: 0.28, fade: 1, warmth: 0.04, desat: 0, flash: 0, freeze: 0, pulseR: -1, pulseO: new THREE.Vector3() });

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const INK = /* glsl */ `
uniform sampler2D tColor, tDepth; uniform vec2 uTexel; uniform float uNear, uFar, uInk, uWidth, uWeight, uFreeze, uPulseR; uniform mat4 uInvProj, uCamWorld; uniform vec3 uPulseO; varying vec2 vUv;
float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return (uNear*uFar)/(uFar - d*(uFar-uNear)); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb;
  float z = viewZ(vUv);
  vec2 o = uTexel*uWidth;
  float zl = viewZ(vUv-vec2(o.x,0.)), zr = viewZ(vUv+vec2(o.x,0.)), zu = viewZ(vUv+vec2(0.,o.y)), zd = viewZ(vUv-vec2(0.,o.y));
  // second-difference of depth: fires on silhouettes and creases, not on receding planes
  float e = (abs(zl+zr-2.*z) + abs(zu+zd-2.*z)) / max(z, .05);
  float edge = smoothstep(.012, .05, e);
  vec3 cl = texture2D(tColor, vUv-vec2(o.x,0.)).rgb, cr = texture2D(tColor, vUv+vec2(o.x,0.)).rgb, cu = texture2D(tColor, vUv+vec2(0.,o.y)).rgb, cd = texture2D(tColor, vUv-vec2(0.,o.y)).rgb;
  float ce = max(length(cl-cr), length(cu-cd));
  edge = max(edge, smoothstep(.55, 1.1, ce)*.55);
  edge *= uInk * smoothstep(140., 30., z);           // lines thin out with distance like background paint
  vec3 ink = c*vec3(.16,.12,.2);
  vec3 col = mix(c, ink, edge);
  // the freeze: a wave front travelling through the world (reconstructed from depth); everything behind it takes the stopped-time grade
  float d0 = texture2D(tDepth, vUv).x, frozen = uFreeze;
  if (uPulseR > 0.) {
    vec4 vp = uInvProj * vec4(vUv*2.-1., d0*2.-1., 1.); vp /= vp.w; float dist = distance((uCamWorld * vp).xyz, uPulseO);
    frozen = max(frozen, d0 > .99999 ? smoothstep(160., 260., uPulseR) : smoothstep(uPulseR, uPulseR - 2.5, dist));
    float w = .35 + uPulseR*.035, band = exp(-pow((dist - uPulseR)/w, 2.));
    col += vec3(.55,.82,1.) * band * .95 * step(d0, .99999) * smoothstep(260., 40., uPulseR);
  }
  float lum = dot(col, vec3(.2126,.7152,.0722));
  col = mix(col, mix(vec3(lum), col, .76) * vec3(.92,.99,1.09), frozen);
  gl_FragColor = vec4(col*uWeight, uWeight);
}`;
const FINAL = /* glsl */ `
uniform sampler2D tColor, tOverlay; uniform float uExposure, uSat, uContrast, uVig, uFade, uWarm, uDesat, uFlash, uOverlayA; varying vec2 vUv;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb * uExposure;
  float m = max(c.r, max(c.g, c.b));
  float mt = m < .8 ? m : .8 + .2*tanh((m-.8)/.2*.8);     // soft shoulder that keeps hue
  c *= mt/max(m,1e-5);
  float l = dot(c, vec3(.2126,.7152,.0722));
  c = mix(vec3(l), c, uSat*(1.-uDesat));
  c = mix(c, c*vec3(.86,.95,1.12), uDesat*.6);            // frozen time: cooler, quieter
  c = pow(max(c,0.), vec3(uContrast));
  c *= vec3(1.+uWarm, 1., 1.-uWarm*1.2);
  vec2 q = vUv*2.-1.; c *= 1. - uVig*smoothstep(.6, 1.6, length(q*vec2(.92,1.)));
  c += uFlash;
  c = pow(max(c,0.), vec3(1./2.2));
  c *= uFade;
  vec4 o = texture2D(tOverlay, vUv); c = mix(c, o.rgb, o.a*uOverlayA);
  c += (hash(vUv*vec2(1920.,1080.))-.5)/255.;
  gl_FragColor = vec4(c, 1.);
}`;

export class Post {
  rt: THREE.WebGLRenderTarget; acc: THREE.WebGLRenderTarget;
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); qs = new THREE.Scene(); quad: THREE.Mesh;
  ink: THREE.ShaderMaterial; fin: THREE.ShaderMaterial;
  overlay: HTMLCanvasElement; overlayTex: THREE.CanvasTexture;
  constructor(public renderer: THREE.WebGLRenderer, public w: number, public h: number) {
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
    this.rt.depthTexture = new THREE.DepthTexture(w, h); this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.acc = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    this.overlay = document.createElement('canvas'); this.overlay.width = 1920; this.overlay.height = 1080;
    this.overlayTex = new THREE.CanvasTexture(this.overlay); this.overlayTex.colorSpace = THREE.NoColorSpace;
    const mk = (frag: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.ink = mk(INK, { tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, uNear: { value: 0.1 }, uFar: { value: 1000 }, uInk: { value: 1 }, uWidth: { value: 1 }, uWeight: { value: 1 }, uFreeze: { value: 0 }, uPulseR: { value: -1 }, uPulseO: { value: new THREE.Vector3() }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() } });
    this.ink.blending = THREE.CustomBlending; this.ink.blendSrc = THREE.OneFactor; this.ink.blendDst = THREE.OneFactor; this.ink.blendEquation = THREE.AddEquation; this.ink.transparent = true;
    this.fin = mk(FINAL, { tColor: { value: this.acc.texture }, tOverlay: { value: this.overlayTex }, uExposure: { value: 1 }, uSat: { value: 1 }, uContrast: { value: 1 }, uVig: { value: 0.3 }, uFade: { value: 1 }, uWarm: { value: 0 }, uDesat: { value: 0 }, uFlash: { value: 0 }, uOverlayA: { value: 0 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ink); this.quad.frustumCulled = false; this.qs.add(this.quad);
  }
  begin() { this.renderer.setRenderTarget(this.acc); this.renderer.setClearColor(0x000000, 0); this.renderer.clear(); }
  /** Render one sub-frame of the scene and add it to the accumulation buffer. */
  sub(scene: THREE.Scene, camera: THREE.PerspectiveCamera, look: Look, weight: number) {
    const r = this.renderer;
    r.setRenderTarget(this.rt); r.setClearColor(0x000000, 1); r.clear(); r.render(scene, camera);
    const u = this.ink.uniforms; u.uNear.value = camera.near; u.uFar.value = camera.far; u.uInk.value = look.ink; u.uWidth.value = look.inkWidth * (this.h / 1080); u.uWeight.value = weight; u.uFreeze.value = look.freeze; u.uPulseR.value = look.pulseR; u.uPulseO.value.copy(look.pulseO); u.uInvProj.value.copy(camera.projectionMatrixInverse); u.uCamWorld.value.copy(camera.matrixWorld);
    this.quad.material = this.ink; r.setRenderTarget(this.acc); const ac = r.autoClear; r.autoClear = false; r.render(this.qs, this.cam); r.autoClear = ac;
  }
  end(look: Look, overlayAlpha: number) {
    const f = this.fin.uniforms;
    f.uExposure.value = look.exposure; f.uSat.value = look.saturation; f.uContrast.value = look.contrast; f.uVig.value = look.vignette; f.uFade.value = look.fade;
    f.uWarm.value = look.warmth; f.uDesat.value = look.desat; f.uFlash.value = look.flash; f.uOverlayA.value = overlayAlpha;
    this.quad.material = this.fin; this.renderer.setRenderTarget(null); this.renderer.render(this.qs, this.cam);
  }
}
