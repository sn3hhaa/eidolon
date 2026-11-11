/**
 * The look: cel shading with a hard sun terminator and cool violet shadow fill,
 * painterly canvas-generated textures, a deep cobalt sky with painted cumulus.
 */
import * as THREE from 'three';

type C = THREE.ColorRepresentation;
/** Direction TO the sun: warm afternoon light from the east, a little south: Main St is lit along its length. (+X east, +Z south.) */
export const SUN_DIR = new THREE.Vector3(0.8, 0.56, 0.21).normalize();

export function rng(seed: number) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Object.assign(f, { range: (lo: number, hi: number) => lo + (hi - lo) * f(), pick: <T,>(arr: T[]): T => arr[Math.floor(f() * arr.length)], sign: () => (f() < 0.5 ? -1 : 1), int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * f()) });
}

// 3-tone ramp sampled by N·L across [-1,1]: shadow | thin half-tone | light
let _ramp: THREE.DataTexture | null = null;
export function ramp() {
  if (_ramp) return _ramp;
  const n = 32, d = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) { const ndl = (i + 0.5) / n * 2 - 1; const v = ndl < 0.02 ? 0 : ndl < 0.16 ? 150 : 255; d.set([v, v, v, 255], i * 4); }
  _ramp = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat);
  _ramp.minFilter = _ramp.magFilter = THREE.NearestFilter; _ramp.generateMipmaps = false; _ramp.needsUpdate = true;
  return _ramp;
}

export interface ToonOpts { map?: THREE.Texture | null; side?: THREE.Side; vertexColors?: boolean; emissive?: C; emissiveIntensity?: number; transparent?: boolean; opacity?: number; alphaTest?: number; depthWrite?: boolean }
export function toon(color: C = '#ffffff', o: ToonOpts = {}) {
  const m = new THREE.MeshToonMaterial({
    color, gradientMap: ramp(), map: o.map ?? null, side: o.side ?? THREE.FrontSide, vertexColors: !!o.vertexColors,
    emissive: o.emissive ?? '#000000', emissiveIntensity: o.emissiveIntensity ?? 1, transparent: !!o.transparent, opacity: o.opacity ?? 1, alphaTest: o.alphaTest ?? 0,
  });
  if (o.depthWrite !== undefined) m.depthWrite = o.depthWrite;
  return m;
}
/** Unlit flat colour (sky cards, screens, glows). */
export const flat = (color: C, o: { map?: THREE.Texture; transparent?: boolean; opacity?: number; side?: THREE.Side; fog?: boolean } = {}) =>
  new THREE.MeshBasicMaterial({ color, map: o.map ?? null, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, fog: o.fog ?? true });

/** Canvas-painted texture (sRGB, mipmapped, repeatable). */
export function paintTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** Gouache-like surface: a base colour broken by soft blotches and directional dabs. */
export function gouache(base: string, o: { seed?: number; size?: number; vary?: number; dabs?: number; streak?: boolean; speck?: string } = {}) {
  const R = rng(o.seed ?? 1), S = o.size ?? 256, vary = o.vary ?? 0.07;
  return paintTex(S, S, (g) => {
    const col = new THREE.Color(base);
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    const n = o.dabs ?? 140;
    for (let i = 0; i < n; i++) {
      const c = col.clone().offsetHSL(R.range(-0.012, 0.012), R.range(-0.05, 0.05), R.range(-vary, vary));
      g.fillStyle = `#${c.getHexString()}`; g.globalAlpha = R.range(0.18, 0.5);
      const x = R() * S, y = R() * S, rw = R.range(S * 0.04, S * 0.2), rh = o.streak ? rw * R.range(0.12, 0.3) : rw * R.range(0.5, 1);
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.beginPath(); g.ellipse(x + ox, y + oy, rw, rh, o.streak ? 0 : R() * 3, 0, 7); g.fill(); }
    }
    if (o.speck) { g.fillStyle = o.speck; for (let i = 0; i < n * 3; i++) { g.globalAlpha = R.range(0.15, 0.5); g.fillRect(R() * S, R() * S, R.range(1, 3), R.range(1, 2)); } }
    g.globalAlpha = 1;
  }, [1, 1]);
}

/** Sky dome: cobalt zenith → pale warm horizon, with hand-drawn cumulus stacks. */
export function makeSky() {
  const tex = paintTex(4096, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#1140c8'); grd.addColorStop(0.45, '#2a6fe6'); grd.addColorStop(0.8, '#7fb8f2'); grd.addColorStop(1, '#cfe6f5');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const R = rng(42);
    const cloud = (cx: number, cy: number, s: number) => {
      const puffs: [number, number, number][] = [];
      const n = 16 + Math.floor(R() * 14);
      for (let i = 0; i < n; i++) { const a = R(), px = (a - 0.5) * s * 2.6, hgt = (1 - Math.pow(Math.abs(a - 0.5) * 2, 1.6)) * s * 1.1; puffs.push([cx + px, cy - R() * hgt, s * R.range(0.22, 0.5)]); }
      for (const [layer, col, dy, k] of [[0, '#8f9fd6', 0.16, 1.04], [1, '#c9d4f2', 0.06, 1.0], [2, '#ffffff', -0.05, 0.9]] as [number, string, number, number][]) {
        g.fillStyle = col;
        for (const [x, y, r] of puffs) for (const ox of [-w, 0, w]) { g.beginPath(); g.arc(x + ox, y + dy * s, r * k * (layer === 2 ? 0.92 : 1), 0, 7); g.fill(); }
      }
      g.fillStyle = '#8f9fd6'; for (const ox of [-w, 0, w]) g.fillRect(cx + ox - s * 1.5, cy + s * 0.18, s * 3, s * 0.08);
    };
    for (let i = 0; i < 15; i++) cloud(R() * w, h * R.range(0.74, 0.9), R.range(50, 150));
    for (let i = 0; i < 6; i++) cloud(R() * w, h * R.range(0.5, 0.66), R.range(24, 56));
  });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(1, 1);
  const geo = new THREE.SphereGeometry(900, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const uv = geo.attributes.uv; // v: 1 at zenith → 0 at lower edge; stretch so the horizon band sits near the texture bottom
  for (let i = 0; i < uv.count; i++) uv.setY(i, Math.pow(uv.getY(i), 0.8));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -100; m.frustumCulled = false;
  return m;
}

/** Sun + sky fill rig. The shadow frustum is re-fitted around the action each frame, snapped to texels. */
export class Sun {
  light = new THREE.DirectionalLight('#fff0d0', 3.1);
  hemi = new THREE.HemisphereLight('#8fa4ff', '#c98a6a', 1.55);
  private right = new THREE.Vector3(); private up = new THREE.Vector3();
  constructor(scene: THREE.Scene) {
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(4096, 4096);
    this.light.shadow.bias = -0.0006; this.light.shadow.normalBias = 0.03;
    this.right.crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize(); this.up.crossVectors(SUN_DIR, this.right).normalize();
    scene.add(this.light, this.light.target, this.hemi);
    this.focus(new THREE.Vector3(), 30);
  }
  focus(center: THREE.Vector3, radius: number) {
    const cam = this.light.shadow.camera as THREE.OrthographicCamera, texel = (radius * 2) / 4096;
    const r = Math.round(center.dot(this.right) / texel) * texel, u = Math.round(center.dot(this.up) / texel) * texel, d = center.dot(SUN_DIR);
    const c = new THREE.Vector3().addScaledVector(this.right, r).addScaledVector(this.up, u).addScaledVector(SUN_DIR, d);
    this.light.target.position.copy(c); this.light.position.copy(c).addScaledVector(SUN_DIR, 150);
    if (cam.right !== radius) { cam.left = -radius; cam.right = radius; cam.top = radius; cam.bottom = -radius; cam.near = 1; cam.far = 320; cam.updateProjectionMatrix(); }
    this.light.target.updateMatrixWorld(); this.light.updateMatrixWorld();
  }
}
