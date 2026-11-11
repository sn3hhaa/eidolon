/**
 * Actor: a VRM humanoid (CC0 VRoid sample avatars) posed as a pure function of time.
 *  - baked CC0 animation clips (Quaternius Universal Animation Library) retargeted by
 *    world-space rotation deltas onto the VRM normalized rig, blended in masked layers
 *  - additive FK tweaks, analytic two-bone IK for legs/arms, head/eye aiming
 *  - expressions (VRM blendshapes) and spring-bone hair, stepped explicitly
 *
 * Frame convention (after VRMUtils.rotateVRM0): the character faces +Z, up +Y, its LEFT is +X.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const CLIP_FPS = 30;
const UE2VRM: Record<string, string> = { pelvis: 'hips', spine_01: 'spine', spine_02: 'chest', spine_03: 'upperChest', neck_01: 'neck', Head: 'head' };
for (const [s, S] of [['l', 'left'], ['r', 'right']]) {
  Object.assign(UE2VRM, { [`clavicle_${s}`]: `${S}Shoulder`, [`upperarm_${s}`]: `${S}UpperArm`, [`lowerarm_${s}`]: `${S}LowerArm`, [`hand_${s}`]: `${S}Hand`, [`thigh_${s}`]: `${S}UpperLeg`, [`calf_${s}`]: `${S}LowerLeg`, [`foot_${s}`]: `${S}Foot`, [`ball_${s}`]: `${S}Toes` });
  for (const [f, F] of [['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Little']]) for (const [i, P] of [['01', 'Proximal'], ['02', 'Intermediate'], ['03', 'Distal']]) UE2VRM[`${f}_${i}_${s}`] = `${S}${F}${P}`;
  Object.assign(UE2VRM, { [`thumb_01_${s}`]: `${S}ThumbMetacarpal`, [`thumb_02_${s}`]: `${S}ThumbProximal`, [`thumb_03_${s}`]: `${S}ThumbDistal` });
}
/** Universal Animation Library 1 ships Rigify "DEF-" names; map them onto the UE-style names. */
function ueName(n: string): string {
  const fixed: Record<string, string> = { 'DEF-hips': 'pelvis', 'DEF-spine001': 'spine_01', 'DEF-spine002': 'spine_02', 'DEF-spine003': 'spine_03', 'DEF-neck': 'neck_01', 'DEF-head': 'Head' };
  if (fixed[n]) return fixed[n];
  const m = /^DEF-(.+?)([LR])$/.exec(n);
  if (!m) return n;
  const side = m[2].toLowerCase();
  const base: Record<string, string> = { shoulder: 'clavicle', upper_arm: 'upperarm', forearm: 'lowerarm', hand: 'hand', thigh: 'thigh', shin: 'calf', foot: 'foot', toe: 'ball' };
  if (base[m[1]]) return `${base[m[1]]}_${side}`;
  const f = /^(?:f_)?(index|middle|ring|pinky|thumb)0(\d)$/.exec(m[1]);
  return f ? `${f[1]}_0${f[2]}_${side}` : n;
}

export interface BakedClip { name: string; duration: number; frames: number; rot: Map<string, Float32Array>; hip: Float32Array; dirs: Map<string, THREE.Vector3> }
interface Lib { scene: THREE.Object3D; clips: Map<string, THREE.AnimationClip>; bones: Map<string, THREE.Object3D>; restW: Map<string, THREE.Quaternion>; dirs: Map<string, THREE.Vector3>; hipRest: THREE.Vector3 }
const libs: Lib[] = [];
const baked = new Map<string, BakedClip>();
const ALIGN = ['leftUpperArm', 'leftLowerArm', 'rightUpperArm', 'rightLowerArm', 'leftUpperLeg', 'leftLowerLeg', 'rightUpperLeg', 'rightLowerLeg'];
const CHILD: Record<string, string> = { UpperArm: 'LowerArm', LowerArm: 'Hand', UpperLeg: 'LowerLeg', LowerLeg: 'Foot' };
const childOf = (n: string) => n.replace(/(UpperArm|LowerArm|UpperLeg|LowerLeg)$/, (m) => CHILD[m]);

const vrmBuffers = new Map<string, Promise<ArrayBuffer>>();
const loader = new GLTFLoader(); loader.register((p) => new VRMLoaderPlugin(p));

export async function loadAnimationLibraries() {
  if (libs.length) return;
  const L = new GLTFLoader();
  const files = await Promise.all(['UAL1_Standard.glb', 'UAL2_Standard.glb'].map((f) => L.loadAsync('/assets/quaternius/' + f)));
  files.forEach((g, i) => {
    const rename = i === 0 ? ueName : (n: string) => n;
    const bones = new Map<string, THREE.Object3D>();
    g.scene.traverse((o) => { const v = UE2VRM[rename(o.name)]; if (v) bones.set(v, o); });
    g.scene.updateMatrixWorld(true);
    const restW = new Map<string, THREE.Quaternion>(), dirs = new Map<string, THREE.Vector3>();
    for (const [n, b] of bones) restW.set(n, b.getWorldQuaternion(new THREE.Quaternion()));
    for (const n of ALIGN) dirs.set(n, bones.get(childOf(n))!.getWorldPosition(new THREE.Vector3()).sub(bones.get(n)!.getWorldPosition(new THREE.Vector3())).normalize());
    const clips = new Map<string, THREE.AnimationClip>();
    for (const c of g.animations) clips.set(c.name, c);
    libs.push({ scene: g.scene, clips, bones, restW, dirs, hipRest: bones.get('hips')!.getWorldPosition(new THREE.Vector3()) });
  });
}

/** Bake a library clip to per-bone world-space rotation deltas from the source rest pose (lazy, cached). */
export function clip(name: string): BakedClip {
  const hit = baked.get(name); if (hit) return hit;
  const lib = libs.find((l) => l.clips.has(name)); if (!lib) throw new Error('no clip ' + name);
  const src = lib.clips.get(name)!, frames = Math.max(2, Math.ceil(src.duration * CLIP_FPS) + 1);
  const out: BakedClip = { name, duration: src.duration, frames, rot: new Map(), hip: new Float32Array(frames * 3), dirs: lib.dirs };
  for (const n of lib.bones.keys()) out.rot.set(n, new Float32Array(frames * 4));
  const tracks = src.tracks.map((tr) => { const i = tr.name.lastIndexOf('.'); return { node: lib.scene.getObjectByName(tr.name.slice(0, i)), prop: tr.name.slice(i + 1), it: (tr as any).createInterpolant(new Float32Array(tr.getValueSize())) as THREE.Interpolant }; }).filter((t) => t.node && (t.prop === 'quaternion' || t.prop === 'position'));
  const saved = tracks.map((t) => (t.prop === 'quaternion' ? t.node!.quaternion.clone() : t.node!.position.clone()));
  const q = new THREE.Quaternion(), p = new THREE.Vector3(), hipH = lib.hipRest.y;
  for (let f = 0; f < frames; f++) {
    const time = Math.min(f / CLIP_FPS, src.duration);
    for (const t of tracks) { const v = t.it.evaluate(time) as Float32Array; if (t.prop === 'quaternion') t.node!.quaternion.fromArray(v); else t.node!.position.fromArray(v); }
    lib.scene.updateMatrixWorld(true);
    for (const [n, b] of lib.bones) { b.getWorldQuaternion(q).multiply(_q.copy(lib.restW.get(n)!).invert()); out.rot.get(n)!.set([q.x, q.y, q.z, q.w], f * 4); }
    lib.bones.get('hips')!.getWorldPosition(p).sub(lib.hipRest).divideScalar(hipH); out.hip.set([p.x, p.y, p.z], f * 3);
  }
  tracks.forEach((t, i) => { if (t.prop === 'quaternion') t.node!.quaternion.copy(saved[i] as THREE.Quaternion); else t.node!.position.copy(saved[i] as THREE.Vector3); });
  baked.set(name, out);
  return out;
}

export type Mask = 'all' | 'upper' | 'lower' | 'arms' | 'armL' | 'armR' | 'legs' | 'torso' | 'head' | 'hands';
const inMask = (mask: Mask, b: string): boolean => {
  const arm = /(Shoulder|Arm|Hand|Thumb|Index|Middle|Ring|Little)/.test(b), leg = /(Leg|Foot|Toes)/.test(b);
  switch (mask) {
    case 'all': return true;
    case 'lower': return leg || b === 'hips';
    case 'upper': return !leg && b !== 'hips';
    case 'arms': return arm;
    case 'armL': return arm && b.startsWith('left');
    case 'armR': return arm && b.startsWith('right');
    case 'legs': return leg;
    case 'torso': return b === 'spine' || b === 'chest' || b === 'upperChest' || b === 'neck' || b === 'head';
    case 'head': return b === 'neck' || b === 'head';
    case 'hands': return /(Hand|Thumb|Index|Middle|Ring|Little)/.test(b);
  }
};
export interface Layer { clip: string; time: number; weight: number; mask?: Mask; loop?: boolean }

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _e = new THREE.Euler();
const EXPR = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight'] as const;
export type Face = Partial<Record<(typeof EXPR)[number], number>>;

export class Actor {
  root = new THREE.Group();
  /** full VRM (expressions, eyes, spring bones); absent on lightweight crowd instances */
  vrm!: VRM;
  nb: Record<string, THREE.Object3D> = {};      // normalized bones (rest = identity, T-pose)
  raw: Record<string, THREE.Object3D> = {};     // raw skeleton bones (attach props here via attach())
  order: string[] = [];                         // parents first
  parent: Record<string, string | null> = {};
  restPos: Record<string, THREE.Vector3> = {};
  align: Record<string, THREE.Vector3> = {};
  hipHeight = 0.9; height = 1.6;
  meshes: THREE.SkinnedMesh[] = [];
  private worldQ: Record<string, THREE.Quaternion> = {};
  /** VRM0 rigs face -Z in rig space (the scene is turned 180°); character-frame rotations are conjugated into it. */
  flip = false; restQ = new THREE.Quaternion();
  private cq(q: THREE.Quaternion) { if (this.flip) { q.x = -q.x; q.z = -q.z; } return q; }
  /** extra ground clearance (e.g. skates) added to the rest hip height */
  lift = 0;

  static ids = 0;
  static async load(file: string): Promise<Actor> {
    if (!vrmBuffers.has(file)) vrmBuffers.set(file, fetch(file).then((r) => r.arrayBuffer()));
    const gltf = await loader.parseAsync(await vrmBuffers.get(file)!, '');
    const a = new Actor(); a.init(gltf.userData.vrm as VRM); return a;
  }

  /**
   * Lightweight crowd instance: a skeleton clone of a master avatar that shares its geometry, materials and textures.
   * No expressions/eyes/springs; the retargeted pose is written straight onto the raw bones (VRoid rest rotations are identity).
   */
  static masters = new Map<string, Promise<Actor>>();
  static async instance(file: string, maxTex = 1024): Promise<Actor> {
    if (!Actor.masters.has(file)) Actor.masters.set(file, Actor.load(file).then((m) => { shrinkTextures(m.vrm.scene, maxTex); return m; }));
    const m = await Actor.masters.get(file)!, a = new Actor(), scene = SkeletonUtils.clone(m.vrm.scene);
    a.flip = m.flip; a.restQ.copy(m.restQ); a.root.add(scene);
    for (const [k, b] of Object.entries(m.raw)) { const n = scene.getObjectByName(b.name); if (n) { a.nb[k] = n; a.raw[k] = n; } }
    a.finishInit(scene);
    return a;
  }

  private init(vrm: VRM) {
    this.vrm = vrm;
    VRMUtils.rotateVRM0(vrm);
    this.flip = String((vrm.meta as any)?.metaVersion) === '0';
    if (this.flip) this.restQ.set(0, 1, 0, 0);
    this.root.add(vrm.scene);
    const H = vrm.humanoid;
    for (const name of Object.keys(H.humanBones)) {
      const n = H.getNormalizedBoneNode(name as any), r = H.getRawBoneNode(name as any);
      if (!n || !r) continue;
      this.nb[name] = n; this.raw[name] = r;
    }
    this.mergePrimitives();
    this.finishInit(vrm.scene);
    if (vrm.lookAt) vrm.lookAt.autoUpdate = false;
  }

  private finishInit(scene: THREE.Object3D) {
    const byNode = new Map<THREE.Object3D, string>(); for (const [k, n] of Object.entries(this.nb)) byNode.set(n, k);
    const visit = (o: THREE.Object3D, par: string | null) => { const k = byNode.get(o); if (k) { this.order.push(k); this.parent[k] = par; this.restPos[k] = o.position.clone(); this.worldQ[k] = new THREE.Quaternion(); } for (const c of o.children) visit(c, k ?? par); };
    visit(this.nb.hips.parent!, null);
    this.root.updateMatrixWorld(true);
    this.hipHeight = this.nb.hips.getWorldPosition(_v).y;
    this.height = this.nb.head.getWorldPosition(_v).y + 0.19;
    for (const n of ALIGN) this.align[n] = this.nb[childOf(n)].getWorldPosition(new THREE.Vector3()).sub(this.nb[n].getWorldPosition(_v)).normalize();
    scene.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh) { m.frustumCulled = false; m.castShadow = true; this.meshes.push(m); } });
  }

  /** VRoid exports dozens of primitives per mesh that share one vertex buffer; fuse those with the same material. */
  private mergePrimitives() {
    const groups: THREE.Object3D[] = []; this.vrm.scene.traverse((o) => { if (o.children.some((c) => (c as THREE.SkinnedMesh).isSkinnedMesh)) groups.push(o); });
    for (const g of groups) {
      const by = new Map<string, THREE.SkinnedMesh[]>();
      for (const c of g.children as THREE.SkinnedMesh[]) { if (!c.isSkinnedMesh || c.morphTargetInfluences?.length) continue; const m = Array.isArray(c.material) ? c.material[0] : c.material; const k = m.uuid + '|' + ((c.geometry.attributes.position as any).__id ??= ++Actor.ids); (by.get(k) ?? by.set(k, []).get(k)!).push(c); }
      for (const list of by.values()) {
        if (list.length < 2) continue;
        const total = list.reduce((s, m) => s + m.geometry.index!.count, 0), idx = new Uint32Array(total); let o = 0;
        for (const m of list) { idx.set(m.geometry.index!.array as ArrayLike<number>, o); o += m.geometry.index!.count; }
        const keep = list[0], geo = new THREE.BufferGeometry();
        for (const [k, a] of Object.entries(keep.geometry.attributes)) geo.setAttribute(k, a);
        geo.setIndex(new THREE.BufferAttribute(idx, 1));
        if (Array.isArray(keep.material)) keep.material.forEach((_, i) => geo.addGroup(0, total, i));
        keep.geometry = geo;
        for (const m of list.slice(1)) m.removeFromParent();
      }
    }
  }

  /** Meshes whose (first) material name contains `part` (e.g. 'Tops', 'Bottoms', 'Shoes', 'Body_00_SKIN', 'Hair'). */
  part(part: string) { return this.meshes.filter((m) => (Array.isArray(m.material) ? m.material[0] : m.material).name.includes(part)); }
  materials(part = '') { const out: THREE.Material[] = []; for (const m of this.meshes) for (const mat of Array.isArray(m.material) ? m.material : [m.material]) if (mat.name.includes(part)) out.push(mat); return out; }

  /** Attach a prop built in character space (x left, y up, z forward) to a raw bone. `offset` is relative to the bone, in character axes. */
  attach(bone: string, obj: THREE.Object3D, offset = new THREE.Vector3()) {
    const holder = new THREE.Group(), b = this.raw[bone];
    this.root.updateMatrixWorld(true);
    // raw bone world orientation at rest → cancel it so the holder is aligned with character space
    holder.quaternion.copy(b.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(this.root.getWorldQuaternion(new THREE.Quaternion())));
    holder.position.copy(offset).applyQuaternion(holder.quaternion);
    holder.add(obj); b.add(holder); return holder;
  }

  /** Reset to T-pose, then blend clip layers (weights relative per bone; uncovered bones stay at rest). */
  pose(layers: Layer[] = []) {
    const s = [0, 0, 0, 0], acc = [0, 0, 0, 0], data = layers.filter((l) => l.weight > 0).map((l) => { const c = clip(l.clip); const loop = l.loop ?? /_Loop$/.test(l.clip); const t = loop ? ((l.time % c.duration) + c.duration) % c.duration : Math.min(Math.max(l.time, 0), c.duration); const f = t * CLIP_FPS, i0 = Math.min(Math.floor(f), c.frames - 1); return { l, c, i0, i1: Math.min(i0 + 1, c.frames - 1), k: f - i0 }; });
    for (const n of this.order) {
      const b = this.nb[n], par = this.parent[n], pw = par ? this.worldQ[par] : null;
      let wsum = 0; acc[0] = acc[1] = acc[2] = acc[3] = 0; let dirs: Map<string, THREE.Vector3> | null = null;
      for (const d of data) {
        if (!inMask(d.l.mask ?? 'all', n)) continue;
        const arr = d.c.rot.get(n); if (!arr) continue;
        for (let k = 0; k < 4; k++) s[k] = arr[d.i0 * 4 + k] * (1 - d.k) + arr[d.i1 * 4 + k] * d.k;
        const sign = wsum > 0 && acc[0] * s[0] + acc[1] * s[1] + acc[2] * s[2] + acc[3] * s[3] < 0 ? -1 : 1;
        for (let k = 0; k < 4; k++) acc[k] += s[k] * d.l.weight * sign;
        wsum += d.l.weight; dirs = d.c.dirs;
      }
      const w = this.worldQ[n];
      if (wsum > 0) {
        w.set(acc[0], acc[1], acc[2], acc[3]).normalize();
        if (this.align[n] && dirs) w.multiply(_q.setFromUnitVectors(this.align[n], dirs.get(n)!));
        if (wsum < 1) w.slerp(pw ?? _q.identity(), 1 - wsum).normalize();
        this.cq(b.quaternion.copy(pw ? _q.copy(pw).invert().multiply(w) : w));
      } else { b.quaternion.identity(); if (pw) w.copy(pw); else w.identity(); }
      b.position.copy(this.restPos[n]);
    }
    let wsum = 0; _v.set(0, 0, 0);
    for (const d of data) { if (!inMask(d.l.mask ?? 'all', 'hips')) continue; const h = d.c.hip; for (let k = 0; k < 3; k++) s[k] = h[d.i0 * 3 + k] * (1 - d.k) + h[d.i1 * 3 + k] * d.k; _v.x += s[0] * d.l.weight; _v.y += s[1] * d.l.weight; _v.z += s[2] * d.l.weight; wsum += d.l.weight; }
    if (wsum > 0) _v.multiplyScalar(this.hipHeight / Math.max(1, wsum));
    const sg = this.flip ? -1 : 1;
    this.nb.hips.position.set(this.restPos.hips.x + sg * _v.x, this.restPos.hips.y + _v.y + this.lift, this.restPos.hips.z + sg * _v.z);
  }

  /** Additive rotation of a bone, in character axes (x: pitch forward +, y: yaw left +, z: roll), applied in the parent frame. */
  rot(bone: string, x: number, y: number, z: number) { const b = this.nb[bone]; b.quaternion.premultiply(this.cq(_q.setFromEuler(_e.set(x, y, z, 'YXZ')))); }
  /** Move the hips in character axes (x left, y up, z forward), relative to the current pose. */
  hipShift(x: number, y: number, z: number) { const sg = this.flip ? -1 : 1; const p = this.nb.hips.position; p.x += sg * x; p.y += y; p.z += sg * z; }
  /** Additive rotation in the bone's own (post-pose) frame. */
  rotLocal(bone: string, x: number, y: number, z: number) { this.nb[bone].quaternion.multiply(this.cq(_q.setFromEuler(_e.set(x, y, z, 'YXZ')))); }
  /** Rotate a bone by a delta expressed in the character root frame (independent of the parent pose). */
  twist(bone: string, x: number, y: number, z: number) {
    const b = this.nb[bone]; b.updateWorldMatrix(true, false);
    const wq = b.getWorldQuaternion(new THREE.Quaternion()), rq = this.root.getWorldQuaternion(new THREE.Quaternion());
    const wd = rq.clone().multiply(_q.setFromEuler(_e.set(x, y, z, 'YXZ'))).multiply(rq.clone().invert());
    this.setWorldQuat(b, wd.multiply(wq));
  }
  setWorldQuat(b: THREE.Object3D, wq: THREE.Quaternion) { b.quaternion.copy(b.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(wq)); }
  worldPos(bone: string, out = new THREE.Vector3()) { this.nb[bone].updateWorldMatrix(true, false); return this.nb[bone].getWorldPosition(out); }

  /** Analytic two-bone IK in world space; `pole` is the direction the middle joint bends toward. */
  limbIK(upper: string, lower: string, end: string, target: THREE.Vector3, pole: THREE.Vector3, endWorldQ?: THREE.Quaternion, weight = 1) {
    const U = this.nb[upper], Lo = this.nb[lower], E = this.nb[end];
    U.updateWorldMatrix(true, true);
    const a = U.getWorldPosition(_v), b = Lo.getWorldPosition(_v2), c = E.getWorldPosition(_v3);
    const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
    const tgt = weight < 1 ? c.clone().lerp(target, weight) : target;
    const to = _v4.copy(tgt).sub(a); let d = to.length();
    d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999);
    const dir = to.normalize();
    const cosA = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
    if (perp.lengthSq() < 1e-8) perp.set(0, 0, 1).addScaledVector(dir, -dir.z); perp.normalize();
    const K = a.clone().addScaledVector(dir, l1 * cosA).addScaledVector(perp, l1 * Math.sqrt(Math.max(0, 1 - cosA * cosA)));
    const T = a.clone().addScaledVector(dir, d);
    let cur = b.clone().sub(a).normalize(), want = K.clone().sub(a).normalize();
    this.setWorldQuat(U, new THREE.Quaternion().setFromUnitVectors(cur, want).multiply(U.getWorldQuaternion(new THREE.Quaternion())));
    U.updateWorldMatrix(false, true);
    const b2 = Lo.getWorldPosition(new THREE.Vector3()), c2 = E.getWorldPosition(new THREE.Vector3());
    cur = c2.sub(b2).normalize(); want = T.clone().sub(b2).normalize();
    this.setWorldQuat(Lo, new THREE.Quaternion().setFromUnitVectors(cur, want).multiply(Lo.getWorldQuaternion(new THREE.Quaternion())));
    Lo.updateWorldMatrix(false, true);
    if (endWorldQ) { this.setWorldQuat(E, _q.copy(endWorldQ).multiply(this.restQ)); E.updateWorldMatrix(false, true); }
  }
  legIK(side: 'left' | 'right', target: THREE.Vector3, pole: THREE.Vector3, footQ?: THREE.Quaternion, weight = 1) { this.limbIK(`${side}UpperLeg`, `${side}LowerLeg`, `${side}Foot`, target, pole, footQ, weight); }
  armIK(side: 'left' | 'right', target: THREE.Vector3, pole: THREE.Vector3, handQ?: THREE.Quaternion, weight = 1) { this.limbIK(`${side}UpperArm`, `${side}LowerArm`, `${side}Hand`, target, pole, handQ, weight); }

  /** Curl the fingers of one hand (0 open … 1 fist). */
  fingers(side: 'left' | 'right', curl: number, thumb = curl * 0.5) {
    const s = side === 'left' ? 1 : -1;
    for (const f of ['Index', 'Middle', 'Ring', 'Little']) for (const p of ['Proximal', 'Intermediate', 'Distal']) { const b = this.nb[`${side}${f}${p}`]; if (b) this.cq(b.quaternion.setFromEuler(_e.set(0, 0, -s * curl * (p === 'Proximal' ? 1.2 : 1.35), 'YXZ'))); }
    for (const p of ['Metacarpal', 'Proximal', 'Distal']) { const b = this.nb[`${side}Thumb${p}`]; if (b) this.cq(b.quaternion.setFromEuler(_e.set(0, s * thumb * 0.6, 0, 'YXZ'))); }
  }

  /** Turn head (and eyes) toward a world point. `head` 0..1 is how much the neck/head contribute; eyes take the rest. */
  lookAt(target: THREE.Vector3, head = 0.7, eyes = 1) {
    const H = this.nb.head; H.updateWorldMatrix(true, false);
    const hp = H.getWorldPosition(_v).add(_v2.set(0, 0.06, 0)), inv = _q2.copy(this.restQ).invert();
    const chest = this.nb.neck.parent!.getWorldQuaternion(new THREE.Quaternion()).multiply(inv).invert();   // world → chest (character-style axes)
    const d = _v3.copy(target).sub(hp).applyQuaternion(chest).normalize();
    const cur = _v4.set(0, 0, 1).applyQuaternion(H.getWorldQuaternion(_q).multiply(inv)).applyQuaternion(chest);
    let yaw = Math.atan2(d.x, d.z) - Math.atan2(cur.x, cur.z), pitch = Math.asin(THREE.MathUtils.clamp(cur.y, -1, 1)) - Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const hy = THREE.MathUtils.clamp(yaw * head, -1.25, 1.25), hpit = THREE.MathUtils.clamp(pitch * head, -0.6, 0.7);
    this.rot('neck', hpit * 0.4, hy * 0.4, 0); this.rotLocal('head', hpit * 0.6, hy * 0.6, 0);
    this.eyes(THREE.MathUtils.clamp((yaw - hy) * eyes, -0.5, 0.5), THREE.MathUtils.clamp((pitch - hpit) * eyes, -0.35, 0.35));
  }
  /** Eye direction relative to the head (radians; yaw + = her left, pitch + = down). */
  eyes(yaw: number, pitch: number) { const la = this.vrm?.lookAt; if (!la) return; la.yaw = THREE.MathUtils.radToDeg(yaw); la.pitch = THREE.MathUtils.radToDeg(-pitch); }

  face(f: Face) { const em = this.vrm?.expressionManager; if (!em) return; for (const k of EXPR) em.setValue(k, f[k] ?? 0); }

  /** Push the normalized pose to the real skeleton, apply expressions/eyes. Call after all posing. */
  commit() { this.root.updateMatrixWorld(true); if (this.vrm) { this.vrm.humanoid.update(); this.vrm.lookAt?.update(0); this.vrm.expressionManager?.update(); this.root.updateMatrixWorld(true); } }
  /** Advance hair/cloth spring bones (stateful: call in increasing time; reset on cuts). */
  springs(dt: number) { if (dt > 0) this.vrm?.springBoneManager?.update(dt); this.root.updateMatrixWorld(true); }
  resetSprings() { this.vrm?.springBoneManager?.reset(); }
}

/** Downscale large textures in place (crowd avatars are never seen close enough to need 2048²). */
export function shrinkTextures(root: THREE.Object3D, max: number) {
  const done = new Set<THREE.Texture>();
  root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; for (const mat of Array.isArray(m.material) ? m.material : [m.material]) for (const v of [...Object.values(mat as any), ...Object.values((mat as any).uniforms ?? {}).map((u: any) => u?.value)]) {
    const t = v as THREE.Texture; if (!t || !t.isTexture || done.has(t)) continue; done.add(t);
    const img = t.image as any; if (!img || !(img.width > max)) continue;
    const c = document.createElement('canvas'); c.width = max; c.height = Math.round((img.height / img.width) * max); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    t.image = c; t.needsUpdate = true;
  } });
}
