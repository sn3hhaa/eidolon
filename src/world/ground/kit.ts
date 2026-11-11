/** Geometry batching kit for the static ground set: collect pieces per material, merge once. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from '../../engine/look';

const mats = new Map<string, THREE.Material>();
/** Cached toon material by colour (+ optional texture key). */
export function M(color: string, map?: THREE.Texture | null, key = '', side: THREE.Side = THREE.FrontSide): THREE.Material {
  const k = `${color}|${key}|${map?.uuid ?? ''}|${side}`;
  let m = mats.get(k);
  if (!m) { m = toon(map ? '#ffffff' : color, { map: map ?? null, side }); if (map && color !== '#ffffff') (m as THREE.MeshToonMaterial).color.set(color); if (!map) m.userData.vc = color; mats.set(k, m); }
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private noShadow = new Set<THREE.Material>();
  private noCast = new Set<THREE.Material>();
  tris = 0;
  /** Add a geometry (consumed) with a transform. */
  add(mat: THREE.Material, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    g.applyMatrix4(_m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz)));
    (this.parts.get(mat) ?? this.parts.set(mat, []).get(mat)!).push(g);
    this.tris += g.attributes.position.count / 3;
    return this;
  }
  /** Box centred at (x, y + h/2, z): i.e. y is its base. */
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) { return this.add(mat, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, ry); }
  /** Vertical cylinder with base at y. */
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, x: number, y: number, z: number, seg = 10) { return this.add(mat, new THREE.CylinderGeometry(r1, r0, h, seg), x, y + h / 2, z); }
  /** Horizontal quad on the ground (top-facing) from x0,z0 to x1,z1 at height y, UVs in metres/uvScale. */
  flatQuad(mat: THREE.Material, x0: number, z0: number, x1: number, z1: number, y: number, uvScale = 1) {
    if (x0 > x1) [x0, x1] = [x1, x0]; if (z0 > z1) [z0, z1] = [z1, z0];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    const u = (v: number) => v / uvScale;
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u(x0), u(z0), u(x0), u(z1), u(x1), u(z1), u(x0), u(z0), u(x1), u(z1), u(x1), u(z0)], 2));
    return this.add(mat, g);
  }
  /** Mark a material's merged mesh as neither casting nor receiving (decals, water) or not casting only. */
  flat(mat: THREE.Material) { this.noShadow.add(mat); return this; }
  ground(mat: THREE.Material) { this.noCast.add(mat); return this; }
  /** Merge per material; all untextured toon colours collapse into one vertex-coloured mesh per (side, shadow) class. */
  build(group: THREE.Group) {
    let calls = 0;
    const vc = new Map<string, { list: THREE.BufferGeometry[]; side: THREE.Side; cast: boolean; recv: boolean }>(), col = new THREE.Color();
    const emit = (list: THREE.BufferGeometry[], mat: THREE.Material, cast: boolean, recv: boolean) => {
      const geo = mergeGeometries(list, false); if (!geo) return;
      for (const g of list) g.dispose();
      const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = cast; mesh.receiveShadow = recv; group.add(mesh); calls++;
    };
    for (const [mat, list] of this.parts) {
      const cast = !this.noShadow.has(mat) && !this.noCast.has(mat), recv = !this.noShadow.has(mat), c = mat.userData.vc as string | undefined;
      if (!c) { emit(list, mat, cast, recv); continue; }
      col.set(c);
      const key = mat.side + '|' + cast + '|' + recv, slot = vc.get(key) ?? vc.set(key, { list: [], side: mat.side, cast, recv }).get(key)!;
      for (const g of list) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); slot.list.push(g); }
    }
    for (const s of vc.values()) emit(s.list, toon('#ffffff', { vertexColors: true, side: s.side }), s.cast, s.recv);
    this.parts.clear();
    return calls;
  }
}
export type Anchors = Record<string, { x: number; y: number; z: number; ry?: number }[]>;
export interface Ctx { b: Batch; group: THREE.Group; solids: [number, number, number, number, number][]; anchors: Anchors; tick: ((tw: number) => void)[] }
export const anchor = (c: Ctx, name: string, x: number, y: number, z: number, ry?: number) => { (c.anchors[name] ??= []).push({ x, y, z, ry }); };
