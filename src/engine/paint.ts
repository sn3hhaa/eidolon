/**
 * The painterly material system. Every surface in the film is drawn by one
 * illustrated shader: banded (quantised) light with brush-noise-perturbed band
 * edges, hue-shifted shadows, hand-decorated procedural patterns, enamel
 * highlights, rim light, optional glass mode, breathing/flutter deformation and
 * atmospheric fog. Lights are not three.js lights but a per-scene LightRig of
 * shared uniforms, so the look is fully art-directed.
 */
import * as THREE from 'three';
import { NOISE } from './glsl';

type C = THREE.ColorRepresentation;
const col = (c: C) => new THREE.Color(c);

export class LightRig {
  u = {
    uTime: { value: 0 },
    uKeyDir: { value: new THREE.Vector3(0.4, 0.8, 0.4).normalize() },
    uKeyCol: { value: col('#ffffff') },
    uSky: { value: col('#1a2a6a').multiplyScalar(0.3) },
    uGround: { value: col('#05050c') },
    uRimCol: { value: col('#7fb0ff') },
    uRigShadow: { value: col('#0b0a3a') },
    uPLPos: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
    uPLCol: { value: [0, 1, 2, 3].map(() => new THREE.Color(0, 0, 0)) },
    uPLRange: { value: [1, 1, 1, 1] },
    uFogCol: { value: col('#000000') },
    uFogDensity: { value: 0 },
    uBreath: { value: 1 },
  };
  key(dir: [number, number, number], c: C, intensity = 1) {
    this.u.uKeyDir.value.set(...dir).normalize();
    this.u.uKeyCol.value.set(c).multiplyScalar(intensity);
    return this;
  }
  ambient(sky: C, ground: C, intensity = 1) {
    this.u.uSky.value.set(sky).multiplyScalar(intensity);
    this.u.uGround.value.set(ground).multiplyScalar(intensity);
    return this;
  }
  rim(c: C, intensity = 1) { this.u.uRimCol.value.set(c).multiplyScalar(intensity); return this; }
  shadow(c: C) { this.u.uRigShadow.value.set(c); return this; }
  point(i: number, pos: THREE.Vector3 | [number, number, number], c: C, intensity: number, range: number) {
    if (Array.isArray(pos)) this.u.uPLPos.value[i].set(...pos); else this.u.uPLPos.value[i].copy(pos);
    this.u.uPLCol.value[i].set(c).multiplyScalar(intensity);
    this.u.uPLRange.value[i] = range;
    return this;
  }
  fog(c: C, density: number) { this.u.uFogCol.value.set(c); this.u.uFogDensity.value = density; return this; }
  set time(t: number) { this.u.uTime.value = t; }
  set breath(b: number) { this.u.uBreath.value = b; }
}

export const PATTERNS = {
  none: 0, stripes: 1, dots: 2, scales: 3, rosette: 4, checker: 5, veins: 6, crackle: 7,
  brocade: 8, bands: 9, filigree: 10, eyes: 11,
} as const;
export type PatternName = keyof typeof PATTERNS;

export interface PaintOpts {
  color?: C;            // base pigment (multiplied by vertex/instance colour)
  shade?: C;            // explicit shadow colour (default: derived, hue-shifted to rig shadow)
  accent?: C;           // pattern pigment
  pattern?: PatternName;
  patternScale?: number | [number, number];
  patternMix?: number;  // 0..1 how strongly the pattern is painted
  emissive?: C; emissiveIntensity?: number;
  emissivePattern?: number; // pattern glows with accent * this
  gloss?: number;       // 0 velvet .. 1 lacquer
  rim?: number;
  bands?: number;       // light quantisation steps
  brush?: number;       // brush irregularity of band edges
  brushScale?: number;
  wear?: number;        // weathering blotches
  vertexColors?: boolean;
  side?: THREE.Side;
  wobble?: number; wobbleFreq?: number; // breathing displacement along normal
  flutter?: number; flutterK?: number; flutterSpeed?: number; // cloth wave growing along uv.y
  glass?: boolean; opacity?: number;    // translucent glass mode
  fog?: boolean;
  additive?: boolean;
  depthWrite?: boolean;
}

const VERT = /* glsl */ `
uniform float uTime, uWobble, uWobbleFreq, uFlutter, uFlutterK, uFlutterSpeed, uBreath;
varying vec3 vWP, vWN, vOP, vCol; varying vec2 vUv;
void main(){
  vec3 p = position; vUv = uv;
  if(uWobble > 0.) p += normal * uWobble * uBreath * sin(uTime*1.25 + position.y*uWobbleFreq + position.x*uWobbleFreq*.7 + position.z*uWobbleFreq*.5);
  if(uFlutter > 0.){
    float a = uv.y;
    p += normal * uFlutter * a * sin(a*uFlutterK - uTime*uFlutterSpeed + uv.x*2.);
  }
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(p, 1.);
  vWP = wp.xyz; vOP = position;
  vWN = normalize(mat3(m) * normal);
  vCol = vec3(1.);
  #ifdef USE_COLOR
    vCol *= color.rgb;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vCol *= instanceColor;
  #endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uKeyDir, uKeyCol, uSky, uGround, uRimCol, uRigShadow, uFogCol;
uniform vec3 uPLPos[4]; uniform vec3 uPLCol[4]; uniform float uPLRange[4];
uniform float uFogDensity;
uniform vec3 uColor, uAccent, uEmissive; uniform vec4 uShade;
uniform int uPattern; uniform vec2 uPatScale;
uniform float uPatMix, uEmissiveI, uEmisPat, uGloss, uRim, uBands, uBrush, uBrushScale, uWear, uGlass, uOpacity, uFog;
varying vec3 vWP, vWN, vOP, vCol; varying vec2 vUv;
${NOISE}
float aastep(float th, float v){ float w = fwidth(v)*.9 + 1e-4; return smoothstep(th-w, th+w, v); }
float tri(float x){ return abs(fract(x)-.5)*2.; }
float pat(int id, vec2 p, vec3 op){
  if(id==1) return aastep(.5, tri(p.x));
  if(id==2){ vec2 q = p; q.x += .5*floor(q.y); vec2 c = fract(q)-.5; return 1.-aastep(.27, length(c)); }
  if(id==3){ vec2 q = p; q.x += .5*mod(floor(q.y),2.); vec2 c = fract(q)-vec2(.5,0.); float d = length(c);
             float d2 = length(c - vec2(.5,1.)); float d3 = length(c - vec2(-.5,1.));
             float e = min(abs(d-.5), min(abs(d2-.5), abs(d3-.5))); return 1.-aastep(.07, e) * step(d, .56); }
  if(id==4){ vec2 c = fract(p)-.5; float a = atan(c.y,c.x), r = length(c);
             return (1.-aastep(.27+.13*cos(a*6.), r)) * aastep(.07, r); }
  if(id==5) return mod(floor(p.x)+floor(p.y), 2.);
  if(id==6){ float n = fbm(op*uPatScale.x); return 1.-smoothstep(.0, .045, abs(n-.5)); }
  if(id==7){ vec2 v = voro(p); return 1.-aastep(.07, v.y-v.x); }
  if(id==8){ vec2 q = vec2(p.x+p.y, p.x-p.y); vec2 c = fract(q)-.5;
             float ln = 1.-aastep(.05, min(abs(c.x),abs(c.y))); float dt = 1.-aastep(.17, length(c));
             vec2 c2 = fract(q+.5)-.5; float dm = 1.-aastep(.09, abs(c2.x)+abs(c2.y)); return max(max(ln*.0, dt), dm); }
  if(id==9) return 1.-aastep(.3, tri(p.y));
  if(id==10){ float f = sin(p.x*6.2832+sin(p.y*6.2832)*1.6)*sin(p.y*6.2832+sin(p.x*6.2832)*1.6); return 1.-aastep(.13, abs(f)); }
  if(id==11){ vec2 q = p; q.x += .5*floor(q.y); vec2 c = fract(q)-.5; float r = length(c);
              return step(r,.44) * aastep(.5, tri(r*4.5)); }
  return 0.;
}
float bandf(float x, float n){ float y = clamp(x,0.,1.)*n; float f = floor(y); return clamp((f + smoothstep(.38,.62,y-f))/n, 0., 1.); }
void main(){
  vec3 N = normalize(vWN); if(!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWP);
  vec3 L = normalize(uKeyDir);
  float pm = uPattern==0 ? 0. : pat(uPattern, vUv*uPatScale, vOP);
  vec3 base = mix(uColor*vCol, uAccent, pm*uPatMix);
  float wn = fbm2(vOP*uBrushScale*.55 + 7.3);
  base *= 1. - uWear*smoothstep(.42,.7,wn);
  float bn = fbm2(vec3(vOP.x*3., vOP.y*.7, vOP.z*3.)*uBrushScale + 2.1);
  float l = dot(N,L)*.5+.5 + (bn-.5)*uBrush;
  float q = bandf(l, uBands);
  float lum = dot(base, vec3(.3,.5,.2));
  vec3 shade = uShade.a > .5 ? uShade.rgb*vCol : mix(base*.2, uRigShadow*(.3+lum*1.4), .5);
  vec3 c = mix(shade, base*(.92+.16*bn), q) * uKeyCol;
  c += base * mix(uGround, uSky, N.y*.5+.5);
  float spec = 0.; vec3 specC = vec3(0.);
  for(int i=0;i<4;i++){
    vec3 d = uPLPos[i]-vWP; float dist = length(d); d /= max(dist,1e-4);
    float at = clamp(1.-dist/uPLRange[i], 0., 1.); at *= at;
    float nl = bandf(dot(N,d)*.5+.5 + (bn-.5)*uBrush, 3.);
    c += base * uPLCol[i] * at * nl;
    float s = pow(max(dot(N, normalize(d+V)),0.), mix(18.,90.,uGloss));
    specC += smoothstep(.45,.6,s) * at * uPLCol[i] * .35;
  }
  float s0 = pow(max(dot(N, normalize(L+V)),0.), mix(18.,90.,uGloss));
  spec += smoothstep(.4,.6,s0) * dot(uKeyCol, vec3(.33));
  c += (vec3(1.,.95,.84) * min(spec,1.6) * .8 + min(specC, vec3(1.2))) * uGloss;
  float fr = pow(1.-max(dot(N,V),0.), 2.5);
  float rimq = smoothstep(.3,.62,fr + (bn-.5)*.2);
  c += uRimCol * rimq * uRim * (.35+lum);
  c += uEmissive*uEmissiveI + uAccent*pm*uEmisPat;
  float alpha = 1.;
  if(uGlass > .5){
    alpha = clamp(uOpacity + (1.-uOpacity)*fr*1.3 + pm*uPatMix*.6 + min(spec,1.)*uGloss, 0., 1.);
    c += uRimCol*fr*.6;
  } else alpha = uOpacity;
  if(uFog > .5){
    float fd = length(cameraPosition - vWP);
    c = mix(c, uFogCol, 1.-exp(-fd*uFogDensity));
  }
  gl_FragColor = vec4(c, alpha);
}`;

export function paint(rig: LightRig, o: PaintOpts = {}): THREE.ShaderMaterial {
  const ps = o.patternScale ?? 8;
  const glass = !!o.glass;
  const transparent = glass || (o.opacity !== undefined && o.opacity < 1) || !!o.additive;
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      ...rig.u,
      uColor: { value: col(o.color ?? '#ffffff') },
      uShade: { value: o.shade !== undefined ? new THREE.Vector4(...col(o.shade).toArray(), 1) : new THREE.Vector4(0, 0, 0, 0) },
      uAccent: { value: col(o.accent ?? '#ffffff') },
      uEmissive: { value: col(o.emissive ?? '#000000') },
      uEmissiveI: { value: o.emissiveIntensity ?? (o.emissive !== undefined ? 1 : 0) },
      uEmisPat: { value: o.emissivePattern ?? 0 },
      uPattern: { value: PATTERNS[o.pattern ?? 'none'] },
      uPatScale: { value: Array.isArray(ps) ? new THREE.Vector2(ps[0], ps[1]) : new THREE.Vector2(ps, ps) },
      uPatMix: { value: o.patternMix ?? 1 },
      uGloss: { value: o.gloss ?? 0.3 },
      uRim: { value: o.rim ?? 0.5 },
      uBands: { value: o.bands ?? 3 },
      uBrush: { value: o.brush ?? 0.22 },
      uBrushScale: { value: o.brushScale ?? 1.5 },
      uWear: { value: o.wear ?? 0 },
      uGlass: { value: glass ? 1 : 0 },
      uOpacity: { value: o.opacity ?? (glass ? 0.25 : 1) },
      uFog: { value: o.fog === false ? 0 : 1 },
      uWobble: { value: o.wobble ?? 0 },
      uWobbleFreq: { value: o.wobbleFreq ?? 0.5 },
      uFlutter: { value: o.flutter ?? 0 },
      uFlutterK: { value: o.flutterK ?? 8 },
      uFlutterSpeed: { value: o.flutterSpeed ?? 3 },
    },
    vertexColors: !!o.vertexColors,
    side: o.side ?? (glass ? THREE.DoubleSide : THREE.FrontSide),
    transparent,
    depthWrite: o.depthWrite ?? !transparent,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  return m;
}

/** Unlit luminous material: light sources, halos, shafts. HDR values feed the selective bloom. */
export function glow(o: { color?: C; intensity?: number; halo?: number; additive?: boolean; opacity?: number; side?: THREE.Side; vertexColors?: boolean } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: col(o.color ?? '#ffffff') },
      uI: { value: o.intensity ?? 2 },
      uHalo: { value: o.halo ?? 0 },
      uOpacity: { value: o.opacity ?? 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN, vV, vCol; varying vec2 vUv;
      void main(){
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        vec4 wp = m*vec4(position,1.); vN = normalize(mat3(m)*normal); vV = cameraPosition - wp.xyz; vUv = uv;
        vCol = vec3(1.);
        #ifdef USE_COLOR
          vCol *= color.rgb;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol *= instanceColor;
        #endif
        gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uI, uHalo, uOpacity; varying vec3 vN, vV, vCol; varying vec2 vUv;
      void main(){
        float a = 1.;
        if(uHalo > 0.) a = pow(abs(dot(normalize(vN), normalize(vV))), uHalo);
        gl_FragColor = vec4(uColor*vCol*uI*a, a*uOpacity);
      }`,
    transparent: (o.additive ?? true) || (o.opacity ?? 1) < 1 || (o.halo ?? 0) > 0,
    depthWrite: !((o.additive ?? true) || (o.halo ?? 0) > 0),
    blending: (o.additive ?? true) ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: o.side ?? THREE.FrontSide,
    vertexColors: !!o.vertexColors,
  });
}

/** Drifting atmospheric motes (deterministic: motion is a pure function of rig time). */
export function motes(rig: LightRig, count: number, place: (i: number, v: THREE.Vector3) => void,
  o: { color?: C; color2?: C; size?: number; intensity?: number; drift?: number; seed?: number } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), v = new THREE.Vector3();
  let s = (o.seed ?? 1) * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < count; i++) { place(i, v); pos.set([v.x, v.y, v.z], i * 3); seed[i] = rnd(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: rig.u.uTime, uColor: { value: col(o.color ?? '#ffd9a0') }, uColor2: { value: col(o.color2 ?? o.color ?? '#ffd9a0') },
      uSize: { value: o.size ?? 0.05 }, uI: { value: o.intensity ?? 1.5 }, uDrift: { value: o.drift ?? 0.4 }, uScale: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime, uSize, uDrift, uScale; varying float vS, vTw;
      void main(){
        vec3 p = position; float s = aSeed*6.2832;
        p += uDrift*vec3(sin(uTime*.31+s*3.), sin(uTime*.23+s*5.)*.8, cos(uTime*.27+s*7.));
        vec4 mv = modelViewMatrix*vec4(p,1.);
        vS = aSeed; vTw = .55+.45*sin(uTime*(1.+aSeed*2.)+s*11.);
        gl_PointSize = uSize*uScale*(.5+aSeed)*1080./max(-mv.z,.05)*projectionMatrix[1][1]*.5;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uColor2; uniform float uI; varying float vS, vTw;
      void main(){ vec2 c = gl_PointCoord-.5; float d = length(c); float a = smoothstep(.5,.0,d); a *= a;
        gl_FragColor = vec4(mix(uColor,uColor2,fract(vS*7.))*uI*vTw*a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

/** Gradient backdrop dome so "black" is never dead: top/bottom pigments with faint painted cloud noise. */
export function backdrop(top: C, bottom: C, o: { radius?: number; noise?: number; mid?: C } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: col(top) }, uBot: { value: col(bottom) }, uMid: { value: col(o.mid ?? bottom) }, uNoise: { value: o.noise ?? 0.15 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `uniform vec3 uTop,uBot,uMid; uniform float uNoise; varying vec3 vD; ${NOISE}
      void main(){ vec3 d = normalize(vD); float h = d.y*.5+.5; float n = fbm(d*3.)-.5; h += n*uNoise;
        vec3 c = h < .5 ? mix(uBot,uMid,smoothstep(0.,.5,h)) : mix(uMid,uTop,smoothstep(.5,1.,h));
        gl_FragColor = vec4(c,1.); }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.radius ?? 400, 32, 16), m);
  mesh.renderOrder = -10;
  return mesh;
}
