/** Geometry batching kit for the building set: everything static is merged per material. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from '../../engine/look';

export type Frame = THREE.Matrix4;
const _m = new THREE.Matrix4(), _c = new THREE.Color();

/** Facade frame: x along the wall (left→right seen from outside), y up, z outward. `o` is the wall's bottom-left corner. */
export function frame(o: THREE.Vector3, right: THREE.Vector3, normal: THREE.Vector3): Frame {
  return new THREE.Matrix4().makeBasis(right, new THREE.Vector3(0, 1, 0), normal).setPosition(o);
}
export const xform = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));

export class Batch {
  private col: THREE.BufferGeometry[] = [];
  private colNoShadow: THREE.BufferGeometry[] = [];
  private tex = new Map<THREE.Material, THREE.BufferGeometry[]>();
  tris = 0;

  private prep(g: THREE.BufferGeometry, m: THREE.Matrix4) {
    const out = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    for (const k of Object.keys(out.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) out.deleteAttribute(k);
    if (!out.attributes.uv) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
    this.tris += out.attributes.position.count / 3;
    return out;
  }
  /** Vertex-coloured, toon-lit piece. Keeps an existing `color` attribute if the geometry has one. */
  add(g: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.ColorRepresentation = '#ffffff', shadow = true) {
    const out = this.prep(g, m), n = out.attributes.position.count;
    if (!out.attributes.color) { _c.set(color); const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } out.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    (shadow ? this.col : this.colNoShadow).push(out);
  }
  /** Textured piece. */
  addTex(g: THREE.BufferGeometry, m: THREE.Matrix4, mat: THREE.Material) {
    const out = this.prep(g, m); out.deleteAttribute('color');
    (this.tex.get(mat) ?? this.tex.set(mat, []).get(mat)!).push(out);
  }
  /** Box centred at (cx,cy,cz) in frame F. */
  box(F: Frame, cx: number, cy: number, cz: number, w: number, h: number, d: number, color: THREE.ColorRepresentation, rx = 0, ry = 0, rz = 0) {
    this.add(new THREE.BoxGeometry(w, h, d), _m.multiplyMatrices(F, xform(cx, cy, cz, rx, ry, rz)).clone(), color);
  }
  /** Flat quad in the frame's XY plane facing +z, lower-left at (x,y), with uv rect. */
  quad(F: Frame, x: number, y: number, z: number, w: number, h: number, mat: THREE.Material, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    this.addTex(g, _m.multiplyMatrices(F, xform(x + w / 2, y + h / 2, z)).clone(), mat);
  }
  build(): THREE.Group {
    const grp = new THREE.Group();
    const mk = (list: THREE.BufferGeometry[], mat: THREE.Material, shadow: boolean) => {
      if (!list.length) return;
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = shadow; mesh.receiveShadow = true; grp.add(mesh);
      for (const g of list) g.dispose();
    };
    const vc = toon('#ffffff', { vertexColors: true });
    mk(this.col, vc, true); mk(this.colNoShadow, vc, false);
    for (const [mat, list] of this.tex) mk(list, mat, true);
    return grp;
  }
}

export const shade = (c: THREE.ColorRepresentation, dl: number, ds = 0, dh = 0) => '#' + new THREE.Color(c).offsetHSL(dh, ds, dl).getHexString();
