/**
 * Shell clothing: garments generated from the avatar's own body mesh so they inherit its skin weights.
 * A region of the (welded) body surface is selected, cut along clean planes, reshaped into a loose
 * garment silhouette, smoothed, and finished with extruded rib bands along every open edge.
 * Garment colours are painted per-fragment from the rest-pose position (crisp panels/stripes, no UVs),
 * and a small "lag + flutter" vertex term gives loose cloth secondary motion.
 * All positions here are in the character frame: x = her left, y = up, z = forward (metres, T-pose).
 */
import * as THREE from 'three';
import { toon } from '../engine/look';
import type { Actor } from './actor';

export interface Body { pos: Float32Array; idx: Uint32Array; bone: string[]; si: Uint16Array; sw: Float32Array; mesh: THREE.SkinnedMesh; names: string[]; remap: Int32Array }

/** Read + weld the body skin mesh. `bone[i]` is the dominant bone of vertex i, as a short name ('Hips', 'L_UpperArm', …). */
export function readBody(actor: Actor): Body {
  const mesh = actor.part('Body_00_SKIN')[0], g = mesh.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, I = g.index!;
  const names = mesh.skeleton.bones.map((b) => b.name.replace(/^J_(Bip|Sec|Adj)_/, '').replace(/^C_/, ''));
  const key = new Map<string, number>(), remap = new Int32Array(P.count), pos: number[] = [], si: number[] = [], sw: number[] = [], bone: string[] = [], s = actor.flip ? -1 : 1;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) * s, y = P.getY(i), z = P.getZ(i) * s, k = `${Math.round(x * 5000)},${Math.round(y * 5000)},${Math.round(z * 5000)}`;
    let id = key.get(k);
    if (id === undefined) {
      id = pos.length / 3; key.set(k, id); pos.push(x, y, z);
      let best = 0; for (let c = 0; c < 4; c++) { si.push(SI.getComponent(i, c)); sw.push(SW.getComponent(i, c)); if (SW.getComponent(i, c) > SW.getComponent(i, best)) best = c; }
      bone.push(names[SI.getComponent(i, best)]);
    }
    remap[i] = id;
  }
  const idx = new Uint32Array(I.count); for (let i = 0; i < I.count; i++) idx[i] = remap[I.getX(i)];
  mesh.userData.flip = s;
  return { pos: new Float32Array(pos), idx, bone, si: new Uint16Array(si), sw: new Float32Array(sw), mesh, names, remap };
}

/** Keep only the body triangles for which `keep` is true for at least one vertex (hide skin that clothing covers). */
export function cutBody(body: Body, keep: (x: number, y: number, z: number, bone: string) => boolean) {
  const out: number[] = [], src = body.mesh.geometry.index!, k = (i: number) => { const v = body.remap[i]; return keep(body.pos[v * 3], body.pos[v * 3 + 1], body.pos[v * 3 + 2], body.bone[v]); };
  for (let i = 0; i < src.count; i += 3) { const a = src.getX(i), b = src.getX(i + 1), c = src.getX(i + 2); if (k(a) || k(b) || k(c)) out.push(a, b, c); }
  const g = new THREE.BufferGeometry(); for (const [n, a] of Object.entries(body.mesh.geometry.attributes)) g.setAttribute(n, a);
  g.setIndex(out); if (Array.isArray(body.mesh.material)) body.mesh.material.forEach((_, i) => g.addGroup(0, out.length, i));
  body.mesh.geometry = g;
}

export interface Band { /** which open edge: test on the loop centroid */ where: (c: THREE.Vector3) => boolean; axis: [number, number, number]; /** [offset along axis, scale about centroid][] */ rings: [number, number][] }
export interface ShellOpts {
  select: (x: number, y: number, z: number, bone: string) => boolean;
  clamp: (p: THREE.Vector3, bone: string) => void;
  shape: (p: THREE.Vector3, n: THREE.Vector3, bone: string) => void;
  loose: (p: THREE.Vector3, bone: string) => number;
  /** rewrite skin weights: map a short bone name to another (e.g. legs → Hips for a jacket hem) */
  rebind?: (bone: string, y: number) => string | null;
  smooth?: number; bands?: Band[];
}

export function makeShell(body: Body, o: ShellOpts): THREE.BufferGeometry {
  const used = new Map<number, number>(), P: THREE.Vector3[] = [], src: number[] = [], tri: number[] = [];
  const ok = (v: number) => o.select(body.pos[v * 3], body.pos[v * 3 + 1], body.pos[v * 3 + 2], body.bone[v]);
  for (let i = 0; i < body.idx.length; i += 3) {
    const t = [body.idx[i], body.idx[i + 1], body.idx[i + 2]]; if (!(ok(t[0]) && ok(t[1]) && ok(t[2]))) continue;
    for (const v of t) { let id = used.get(v); if (id === undefined) { id = P.length; used.set(v, id); P.push(new THREE.Vector3(body.pos[v * 3], body.pos[v * 3 + 1], body.pos[v * 3 + 2])); src.push(v); } tri.push(id); }
  }
  const normals = () => { const N = P.map(() => new THREE.Vector3()), a = new THREE.Vector3(), b = new THREE.Vector3(); for (let i = 0; i < tri.length; i += 3) { a.subVectors(P[tri[i + 1]], P[tri[i]]); b.subVectors(P[tri[i + 2]], P[tri[i]]); a.cross(b); N[tri[i]].add(a); N[tri[i + 1]].add(a); N[tri[i + 2]].add(a); } N.forEach((n) => n.normalize()); return N; };
  const N0 = normals();
  P.forEach((p, i) => { o.clamp(p, body.bone[src[i]]); o.shape(p, N0[i], body.bone[src[i]]); });
  // boundary edges (appear once) → pinned vertices + loops
  const edge = new Map<string, [number, number]>();
  for (let i = 0; i < tri.length; i += 3) for (let e = 0; e < 3; e++) { const a = tri[i + e], b = tri[i + (e + 1) % 3], k = a < b ? `${a},${b}` : `${b},${a}`; if (edge.has(k)) edge.delete(k); else edge.set(k, [a, b]); }
  const pinned = new Set<number>(), next = new Map<number, number>(); for (const [a, b] of edge.values()) { pinned.add(a); pinned.add(b); next.set(a, b); }
  const nb: Set<number>[] = P.map(() => new Set()); for (let i = 0; i < tri.length; i += 3) for (let e = 0; e < 3; e++) { nb[tri[i + e]].add(tri[i + (e + 1) % 3]); nb[tri[i + e]].add(tri[i + (e + 2) % 3]); }
  for (let it = 0; it < (o.smooth ?? 2); it++) { const Q = P.map((p, i) => { if (pinned.has(i) || !nb[i].size) return p.clone(); const c = new THREE.Vector3(); nb[i].forEach((j) => c.add(P[j])); return c.multiplyScalar(1 / nb[i].size).lerp(p, 0.5); }); Q.forEach((q, i) => P[i].copy(q)); }
  // skin data per vertex (copied from the body, optionally rebound)
  const SI: number[] = [], SW: number[] = [], bones: string[] = src.map((v) => body.bone[v]);
  const push = (v: number, y: number) => { const acc = new Map<number, number>(); for (let c = 0; c < 4; c++) { let b = body.si[v * 4 + c]; const w = body.sw[v * 4 + c]; if (w <= 0) continue; const to = o.rebind?.(body.names[b], y); if (to) b = body.names.indexOf(to); acc.set(b, (acc.get(b) ?? 0) + w); } const e = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); const sum = e.reduce((s, x) => s + x[1], 0); for (let c = 0; c < 4; c++) { SI.push(e[c]?.[0] ?? 0); SW.push((e[c]?.[1] ?? 0) / sum); } };
  src.forEach((v, i) => push(v, P[i].y));
  const rest = P.map((p) => p.clone()), loose = P.map((p, i) => o.loose(p, bones[i]));
  // rib bands along open edges
  const seen = new Set<number>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: number[] = []; let v = start; while (!seen.has(v)) { seen.add(v); loop.push(v); v = next.get(v)!; if (v === undefined) break; }
    if (loop.length < 6) continue;
    const c = new THREE.Vector3(); loop.forEach((i) => c.add(P[i])); c.multiplyScalar(1 / loop.length);
    const band = o.bands?.find((b) => b.where(c)); if (!band) continue;
    const ax = new THREE.Vector3(...band.axis); let prev = loop;
    for (const [off, sc] of band.rings) {
      const ring = loop.map((i) => { const p = P[i].clone().sub(c); const along = p.dot(ax); p.addScaledVector(ax, -along).multiplyScalar(sc).addScaledVector(ax, along + off).add(c); const id = P.length; P.push(p); rest.push(p.clone()); loose.push(loose[i]); bones.push(bones[i]); for (let k = 0; k < 4; k++) { SI.push(SI[i * 4 + k]); SW.push(SW[i * 4 + k]); } return id; });
      for (let k = 0; k < loop.length; k++) { const a = prev[k], b = prev[(k + 1) % loop.length], a2 = ring[k], b2 = ring[(k + 1) % loop.length]; tri.push(b, a, a2, b, a2, b2); }
      prev = ring;
    }
  }
  const g = new THREE.BufferGeometry(), n = P.length;
  const flip = body.mesh.userData.flip as number, pa = new Float32Array(n * 3), ra = new Float32Array(n * 3);
  P.forEach((p, i) => { pa.set([p.x * flip, p.y, p.z * flip], i * 3); ra.set([rest[i].x, rest[i].y, rest[i].z], i * 3); });
  g.setAttribute('position', new THREE.BufferAttribute(pa, 3)); g.setAttribute('aRest', new THREE.BufferAttribute(ra, 3)); g.setAttribute('aLoose', new THREE.BufferAttribute(new Float32Array(loose), 1));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  g.setIndex(tri); g.computeVertexNormals();
  return g;
}

export interface ClothUniforms { uLag: { value: THREE.Vector3 }; uFlutter: { value: number }; uTime: { value: number } }
/** Toon material whose base colour comes from a GLSL `vec3 garment(vec3 p)` over the rest position. */
export function garmentMaterial(glsl: string, u: ClothUniforms) {
  const m = toon('#ffffff', { side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aRest; attribute float aLoose; varying vec3 vRest; uniform vec3 uLag; uniform float uFlutter, uTime;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvRest = aRest;\ntransformed += uLag * aLoose + objectNormal * (sin(dot(aRest, vec3(31., 47., 23.)) + uTime * 17.) + sin(aRest.y * 60. - uTime * 23.)) * uFlutter * aLoose;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;\n' + glsl).replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = garment(vRest);');
  };
  m.customProgramCacheKey = () => glsl.length + ':' + glsl.slice(0, 80);
  return m;
}

/** Wrap shell geometry as a SkinnedMesh sharing the body's skeleton. */
export function shellMesh(body: Body, geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.SkinnedMesh(geo, mat); m.bind(body.mesh.skeleton, body.mesh.bindMatrix); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
  body.mesh.parent!.add(m); return m;
}
