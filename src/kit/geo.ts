/**
 * Procedural modelling kit. Everything in the film is assembled from these:
 * lathe profiles, tapered tubes, ribbons, parametric surfaces, petals, extruded
 * ornament silhouettes — tinted with vertex colours and merged into painted
 * sculptures.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Geo = THREE.BufferGeometry;
type C = THREE.ColorRepresentation;
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const TAU = Math.PI * 2;

/** Paint a geometry with a vertex colour (optionally a gradient c→c2 along an axis). */
export function tint(g: Geo, c: C, c2?: C, axis: 'x' | 'y' | 'z' | 'v' = 'y'): Geo {
  const n = g.attributes.position.count, arr = new Float32Array(n * 3);
  const a = new THREE.Color(c), b = c2 !== undefined ? new THREE.Color(c2) : null, t = new THREE.Color();
  let lo = 0, hi = 1;
  if (b && axis !== 'v') { g.computeBoundingBox(); lo = g.boundingBox!.min[axis]; hi = g.boundingBox!.max[axis]; }
  for (let i = 0; i < n; i++) {
    if (b) {
      const k = axis === 'v' ? g.attributes.uv.getY(i) : ((g.attributes.position as any)[`get${axis.toUpperCase()}`](i) - lo) / Math.max(hi - lo, 1e-6);
      t.copy(a).lerp(b, k);
    } else t.copy(a);
    arr[i * 3] = t.r; arr[i * 3 + 1] = t.g; arr[i * 3 + 2] = t.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
/** Bake a transform into a geometry (position, euler rotation, scale). Returns the same geometry. */
export function xf(g: Geo, o: { p?: [number, number, number]; r?: [number, number, number]; s?: number | [number, number, number] }): Geo {
  _p.set(...(o.p ?? [0, 0, 0])); _e.set(...(o.r ?? [0, 0, 0])); _q.setFromEuler(_e);
  if (typeof o.s === 'number') _s.setScalar(o.s); else _s.set(...(o.s ?? [1, 1, 1]));
  g.applyMatrix4(_m.compose(_p, _q, _s));
  return g;
}

/** Merge geometries into one (normalises attributes: position, normal, uv, color). */
export function merge(gs: Geo[]): Geo {
  const out = gs.map((g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const n = g.attributes.position.count;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    g.morphAttributes = {};
    return g;
  });
  return mergeGeometries(out, false)!;
}

/** Revolve a profile of [radius, y] points. smooth>0 runs a spline through them first. */
export function lathe(profile: [number, number][], seg = 24, smooth = 0): Geo {
  let pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
  if (smooth > 0) pts = new THREE.SplineCurve(pts).getPoints(profile.length * smooth);
  return new THREE.LatheGeometry(pts, seg);
}

/** Tapered tube along a point path. radius may be a function of u∈[0,1]. uv = (around, along). */
export function tube(path: THREE.Vector3[] | THREE.Curve<THREE.Vector3>, radius: number | ((u: number) => number),
  o: { radial?: number; seg?: number; closed?: boolean } = {}): Geo {
  const closed = !!o.closed;
  const curve = Array.isArray(path) ? new THREE.CatmullRomCurve3(path, closed, 'centripetal') : path;
  const seg = o.seg ?? (Array.isArray(path) ? path.length * 6 : 48), radial = o.radial ?? 8;
  const fr = curve.computeFrenetFrames(seg, closed);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg; curve.getPointAt(u, P);
    const r = typeof radius === 'number' ? radius : radius(u);
    const N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU, c = Math.cos(a), s = Math.sin(a);
      const nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z;
      pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r); nor.push(nx, ny, nz); uv.push(j / radial, u);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Flat ribbon along a path; width may vary. uv = (across, along) so paint `flutter` waves travel down it. */
export function ribbon(path: THREE.Vector3[] | THREE.Curve<THREE.Vector3>, width: number | ((u: number) => number), o: { seg?: number; twist?: number } = {}): Geo {
  const curve = Array.isArray(path) ? new THREE.CatmullRomCurve3(path, false, 'centripetal') : path;
  const seg = o.seg ?? (Array.isArray(path) ? path.length * 8 : 48);
  const fr = curve.computeFrenetFrames(seg, false);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg; curve.getPointAt(u, P);
    const w = (typeof width === 'number' ? width : width(u)) / 2;
    const tw = (o.twist ?? 0) * u, c = Math.cos(tw), s = Math.sin(tw);
    const N = fr.normals[i], B = fr.binormals[i];
    const bx = c * B.x + s * N.x, by = c * B.y + s * N.y, bz = c * B.z + s * N.z;
    const nx = c * N.x - s * B.x, ny = c * N.y - s * B.y, nz = c * N.z - s * B.z;
    pos.push(P.x - bx * w, P.y - by * w, P.z - bz * w, P.x + bx * w, P.y + by * w, P.z + bz * w);
    nor.push(nx, ny, nz, nx, ny, nz); uv.push(0, u, 1, u);
  }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Parametric surface: fn(u,v,out) with u,v∈[0,1]. uv = (u,v). */
export function surface(fn: (u: number, v: number, out: THREE.Vector3) => void, nu = 16, nv = 16): Geo {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], P = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    fn(i / nu, j / nv, P); pos.push(P.x, P.y, P.z); uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A petal / leaf / feather blade growing along +Y from the origin, facing +Z. */
export function petal(o: { len?: number; width?: number; curl?: number; cup?: number; tip?: number; ruffle?: number; nu?: number; nv?: number } = {}): Geo {
  const len = o.len ?? 1, width = o.width ?? 0.4, curl = o.curl ?? 0.3, cup = o.cup ?? 0.15, tip = o.tip ?? 1, ruf = o.ruffle ?? 0;
  return surface((u, v, P) => {
    const w = width * Math.pow(Math.sin(Math.PI * Math.pow(v, tip) * 0.96 + 0.04), 0.75);
    const x = (u - 0.5) * w;
    const edge = (u - 0.5) * 2;
    P.set(x, len * v * (1 - 0.25 * curl * v), len * curl * v * v + cup * edge * edge * w * 2 + ruf * Math.sin(v * 14) * edge * edge * 0.05);
  }, o.nu ?? 6, o.nv ?? 10);
}

/** Arrange copies of a geometry radially around Y (tilt = lean outward from vertical, radians). */
export function radial(g: Geo, count: number, o: { tilt?: number; radius?: number; y?: number; phase?: number; spin?: number } = {}): Geo[] {
  const out: Geo[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + (o.phase ?? 0);
    const c = g.clone();
    xf(c, { r: [o.tilt ?? 0, 0, 0] });
    if (o.spin) xf(c, { r: [0, 0, o.spin] });
    xf(c, { p: [0, o.y ?? 0, o.radius ?? 0] });
    xf(c, { r: [0, a, 0] });
    out.push(c);
  }
  return out;
}

// ---- ornament silhouettes -------------------------------------------------
export function gearShape(teeth: number, ro: number, ri: number, hole = 0): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * TAU, st = TAU / teeth;
    const pts: [number, number][] = [[ri, 0], [ri, 0.2], [ro, 0.3], [ro, 0.7], [ri, 0.8]];
    pts.forEach(([r, k], j) => { const a = a0 + st * k; if (i === 0 && j === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r); });
  }
  s.closePath();
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}
export function starShape(n: number, r1: number, r2: number, hole = 0): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, r = i % 2 ? r2 : r1; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(r, 0); }
  s.closePath();
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}
/** Scalloped / lobed disc or ring (cartouche, collar, frame). */
export function scallopShape(lobes: number, r: number, depth: number, hole = 0, steps = 8): THREE.Shape {
  const s = new THREE.Shape(), n = lobes * steps;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rr = r * (1 + depth * Math.abs(Math.sin((a * lobes) / 2))); if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(rr, 0); }
  s.closePath();
  if (hole > 0) { const h = new THREE.Path(); h.absellipse(0, 0, hole, hole, 0, TAU, true, 0); s.holes.push(h); }
  return s;
}
/** Ogee (onion) arch frame standing on y=0: outer w×h, wall thickness t. t<=0 gives a solid arch. */
export function archShape(w: number, h: number, t: number): THREE.Shape {
  const path = (s: THREE.Shape | THREE.Path, ww: number, hh: number, y0: number) => {
    const sp = hh * 0.52;
    s.moveTo(-ww / 2, y0); s.lineTo(-ww / 2, sp);
    s.bezierCurveTo(-ww / 2, sp + hh * 0.3, -ww * 0.08, hh * 0.78, 0, hh);
    s.bezierCurveTo(ww * 0.08, hh * 0.78, ww / 2, sp + hh * 0.3, ww / 2, sp);
    s.lineTo(ww / 2, y0); s.closePath();
  };
  const s = new THREE.Shape(); path(s, w, h, 0);
  if (t <= 0) return s;
  // frame: outer outline up and over, then back along the inner outline
  const f = new THREE.Shape(), sp = h * 0.52, wi = w - t * 2, hi = h - t * 1.6, spi = hi * 0.52;
  f.moveTo(-w / 2, 0); f.lineTo(-w / 2, sp);
  f.bezierCurveTo(-w / 2, sp + h * 0.3, -w * 0.08, h * 0.78, 0, h);
  f.bezierCurveTo(w * 0.08, h * 0.78, w / 2, sp + h * 0.3, w / 2, sp);
  f.lineTo(w / 2, 0); f.lineTo(wi / 2, 0); f.lineTo(wi / 2, spi);
  f.bezierCurveTo(wi / 2, spi + hi * 0.3, wi * 0.08, hi * 0.78, 0, hi);
  f.bezierCurveTo(-wi * 0.08, hi * 0.78, -wi / 2, spi + hi * 0.3, -wi / 2, spi);
  f.lineTo(-wi / 2, 0); f.closePath();
  return f;
}
export function extrude(shape: THREE.Shape, depth: number, bevel = 0.02, curveSegments = 10): Geo {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---- small recurring parts -----------------------------------------------
export const ball = (r: number, detail = 2) => new THREE.IcosahedronGeometry(r, detail);
/** Torus lying in the XZ plane. */
export const ring = (r: number, t: number, radialSeg = 8, tubular = 48) => { const g = new THREE.TorusGeometry(r, t, radialSeg, tubular); g.rotateX(Math.PI / 2); return g; };
/** A circle of beads in the XZ plane. */
export function beads(r: number, count: number, size: number, detail = 1): Geo[] {
  const out: Geo[] = [];
  for (let i = 0; i < count; i++) { const a = (i / count) * TAU; out.push(xf(ball(size, detail), { p: [Math.cos(a) * r, 0, Math.sin(a) * r] })); }
  return out;
}
/** Stacked-bulb finial pointing +Y, height h. */
export function finial(h: number, r: number): Geo {
  return lathe([[r * 0.5, 0], [r, h * 0.08], [r * 0.35, h * 0.2], [r * 0.8, h * 0.33], [r * 0.9, h * 0.42], [r * 0.25, h * 0.58], [r * 0.4, h * 0.66], [r * 0.12, h * 0.8], [0.001, h]], 12, 4);
}
/** Ornate column: plinth, swelling shaft with collars, flared capital. Base at y=0. */
export function column(h: number, r: number, seg = 16): Geo {
  return lathe([
    [r * 1.9, 0], [r * 1.9, h * 0.012], [r * 1.5, h * 0.02], [r * 1.6, h * 0.035], [r * 1.1, h * 0.05], [r * 1.25, h * 0.065], [r, h * 0.08],
    [r * 1.08, h * 0.3], [r * 0.9, h * 0.5], [r * 1.25, h * 0.515], [r * 0.9, h * 0.53], [r * 0.82, h * 0.8],
    [r * 1.2, h * 0.9], [r * 0.9, h * 0.915], [r * 1.5, h * 0.95], [r * 2.2, h * 0.985], [r * 2.3, h],
  ], seg, 3);
}

export function mesh(g: Geo, m: THREE.Material, parent?: THREE.Object3D, p?: [number, number, number]) {
  const o = new THREE.Mesh(g, m);
  if (p) o.position.set(...p);
  parent?.add(o);
  return o;
}

/** InstancedMesh with per-instance transform + colour set by a callback. */
export function instances(g: Geo, m: THREE.Material, n: number, fn: (i: number, d: THREE.Object3D, c: THREE.Color) => void, parent?: THREE.Object3D) {
  const im = new THREE.InstancedMesh(g, m, n), d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); c.set(1, 1, 1);
    fn(i, d, c); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, c);
  }
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.frustumCulled = false;
  parent?.add(im);
  return im;
}
