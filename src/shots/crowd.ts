/** The city's people: lightweight instances of the CC0 crowd avatars, posed from retargeted CC0 clips as a function of world time. */
import * as THREE from 'three';
import { Actor } from '../char/actor';
import type { Ground } from '../world/ground';
import { CURB, L } from '../world/layout';
import { hash, sstep } from './util';
import { TFZ } from './traffic';
import { perform } from './perform';

const MODELS = ['ped_a', 'ped_c', 'ped_d', 'ped_e', 'ped_f', 'ped_b'];
const TINTS = ['#ffffff', '#ffd9b0', '#b9d8ff', '#ffc2cf', '#c9f0c0', '#fff0a8', '#d8c4ff', '#ffffff'];
const E = Math.PI / 2, W = -Math.PI / 2, S = 0, N = Math.PI;
interface Spec { m?: number; x: number; z: number; y?: number; yaw: number; clip: string; speed?: number; scale?: number; react?: boolean; phase?: number; once?: number; tag?: string }
interface Ped extends Spec { a: Actor; key: string }

export async function buildCrowd(ground: Ground) {
  const deck = L.highwalk.y, specs: Spec[] = [
    // crossing Main St mid-block (she slaloms through them)
    { x: -3.1, z: 3.5, y: 0, yaw: N, clip: 'Walk_Loop', speed: 1.3 }, { x: -1.2, z: 1.7, y: 0, yaw: S, clip: 'Walk_Formal_Loop', speed: 1.25 }, { x: -2.4, z: 0.0, y: 0, yaw: N, clip: 'Walk_Carry_Loop', speed: 1.1 }, { x: -0.6, z: -1.5, y: 0, yaw: S, clip: 'Walk_Loop', speed: 1.35 }, { x: -2.9, z: -3.2, y: 0, yaw: N, clip: 'Walk_Loop', speed: 1.3 },
    // the court: the ball's owner and friends
    { m: 3, x: -12.0, z: 7.4, yaw: N + 0.35, clip: 'OverhandThrow', once: 0.95, scale: 0.9, tag: 'owner' }, { m: 0, x: -15.5, z: 13.5, yaw: 0.9, clip: 'Idle_Talking_Loop' }, { m: 1, x: -9.5, z: 17, yaw: -2.2, clip: 'Idle_FoldArms_Loop' }, { m: 4, x: -14, z: 24.2, y: CURB + 0.42, yaw: S, clip: 'Jump_Loop' },
    // splash plaza
    { m: 1, x: 14.0, z: 15.9, yaw: 1.0, clip: 'Jog_Fwd_Loop', speed: 2.4, scale: 0.78 }, { m: 2, x: 17.2, z: 21.3, yaw: S, clip: 'Idle_Loop' }, { m: 0, x: 27, z: 11, yaw: W, clip: 'Idle_TalkingPhone_Loop' },
    { m: 3, x: 10.6, z: 7.6, yaw: W, clip: 'Hit_Knockback', once: 0.35, tag: 'grocer' },
    // corners of the intersection
    { m: 5, x: 41.4, z: 9.4, yaw: N, clip: 'Idle_Loop' }, { m: 2, x: 57.6, z: -6.4, yaw: S, clip: 'Idle_TalkingPhone_Loop' }, { m: 0, x: 41.4, z: -6.6, yaw: S, clip: 'Idle_Loop' },
    // High Walk + terrace
    { m: 4, x: 60.7, z: 14.5, y: deck, yaw: W, clip: 'Idle_FoldArms_Loop' }, { m: 1, x: 60.7, z: 29.2, y: deck, yaw: W, clip: 'Idle_TalkingPhone_Loop' },
    { m: 2, x: 68, z: 45.5, y: deck, yaw: E - 0.4, clip: 'Idle_Talking_Loop' }, { m: 3, x: 68.9, z: 45.9, y: deck, yaw: W + 0.3, clip: 'Idle_Loop' }, { m: 0, x: 60.4, z: 54.6, y: deck, yaw: S, clip: 'Idle_Loop', react: true },
    // promenade: the ones who see her land
    { m: 1, x: 69.8, z: 69.2, yaw: W - 0.5, clip: 'Idle_Loop', react: true }, { m: 4, x: 56.2, z: 72.6, yaw: S, clip: 'Idle_TalkingPhone_Loop', react: true }, { m: 2, x: 72, z: 76, yaw: W, clip: 'Walk_Loop', speed: 1.2, react: true }, { m: 3, x: 44, z: 74.5, yaw: E, clip: 'Walk_Loop', speed: 1.25, react: true },
    { m: 0, x: 52, z: 81.6, yaw: S, clip: 'Idle_Loop' }, { m: 5, x: 52.8, z: 81.7, yaw: S + 0.3, clip: 'Idle_Talking_Loop' }, { m: 1, x: 24, z: 74, yaw: E, clip: 'Walk_Formal_Loop', speed: 1.2 }, { m: 2, x: 38.5, z: 82.2, yaw: S, clip: 'Idle_FoldArms_Loop' }, { m: 4, x: 8, z: 76.5, yaw: W, clip: 'Walk_Loop', speed: 1.3 }, { m: 3, x: -6, z: 80, yaw: E, clip: 'Walk_Loop', speed: 1.2 },
    // Main St sidewalks
    { m: 2, x: -50, z: 7.4, yaw: E, clip: 'Walk_Loop', speed: 1.3 }, { m: 4, x: -37, z: 6.4, yaw: W, clip: 'Walk_Formal_Loop', speed: 1.2 }, { m: 0, x: -44.5, z: 8.7, yaw: E, clip: 'Idle_Talking_Loop' }, { m: 1, x: -43.6, z: 8.5, yaw: W, clip: 'Idle_Loop' },
    { m: 3, x: -55, z: -7.2, yaw: E, clip: 'Walk_Loop', speed: 1.3 }, { m: 5, x: -33, z: -6.6, yaw: W, clip: 'Walk_Loop', speed: 1.25 }, { m: 1, x: -14, z: -7.4, yaw: E, clip: 'Walk_Carry_Loop', speed: 1.1 }, { m: 2, x: 8, z: -6.8, yaw: W, clip: 'Walk_Loop', speed: 1.3 }, { m: 0, x: 27, z: -7.2, yaw: E, clip: 'Walk_Formal_Loop', speed: 1.2 }, { m: 4, x: 70, z: -7, yaw: W, clip: 'Walk_Loop', speed: 1.3 },
  ];
  // a few café sitters on the terrace and promenade
  const seats = ground.anchors.cafeSeats ?? []; let used = 0;
  seats.forEach((c, i) => { if (used < 5 && hash(i * 3.3 + 0.7) < 0.3) { specs.push({ x: c.x, z: c.z, y: c.z > 60 ? CURB : c.y > 1 ? deck : CURB, yaw: c.ry ?? 0, clip: i % 2 ? 'Sitting_Idle_Loop' : 'Sitting_Talking_Loop', tag: 'sit' }); used++; } });
  // keep everyone off the protagonist's line
  const line: THREE.Vector3[] = []; for (let s = 0; s < 96; s += 0.12) line.push(perform(s).root.pos.clone());
  const clear = (sp: Spec) => sp.tag === 'owner' || line.every((p) => Math.abs(p.y - (sp.y ?? CURB)) > 1.2 || (p.x - sp.x) ** 2 + (p.z - sp.z) ** 2 > 0.75 * 0.75);
  const group = new THREE.Group(), peds: Ped[] = [];
  let i = 0;
  for (const sp of specs) {
    if (!clear(sp)) { console.warn('crowd: dropped a pedestrian on the hero line', sp.x, sp.z); continue; }
    const a = await Actor.instance(`/assets/cast/${MODELS[sp.m ?? i % MODELS.length]}.vrm`);
    const tint = new THREE.Color(TINTS[Math.floor(hash(i * 9.1 + 3) * TINTS.length)]);
    if (tint.getHex() !== 0xffffff) for (const m of a.meshes) { const mats = Array.isArray(m.material) ? m.material : [m.material]; if (!/CLOTH|HAIR/.test(mats[0].name)) continue; const c = mats.map((x) => x.clone()); (c[0] as any).color?.multiply(tint); m.material = Array.isArray(m.material) ? c : c[0]; }
    a.root.scale.setScalar(sp.scale ?? 0.96 + hash(i * 2.7) * 0.1); group.add(a.root);
    peds.push({ ...sp, a, key: '', phase: sp.phase ?? hash(i * 1.37) * 4 }); i++;
  }
  const _t = new THREE.Vector3();
  return {
    group, peds, owner: peds.find((p) => p.tag === 'owner')!,
    /** react 0..1: how much the bystanders flagged `react` turn to watch `target` */
    set(tw: number, target?: THREE.Vector3, react = 0) {
      const dt = tw - TFZ;
      for (const p of peds) {
        const rw = p.react ? react : 0, key = `${tw.toFixed(4)}|${rw > 0 && target ? target.x.toFixed(2) + target.y.toFixed(2) + target.z.toFixed(2) + rw.toFixed(2) : ''}`;
        if (key === p.key) continue; p.key = key;
        const d = (p.speed ?? 0) * dt * (1 - rw * 0.9);
        p.a.root.position.set(p.x + Math.sin(p.yaw) * d, p.y ?? CURB, p.z + Math.cos(p.yaw) * d); p.a.root.rotation.y = p.yaw;
        if (p.tag === 'owner') { const idle = sstep(TFZ + 1.0, TFZ + 1.6, tw); p.a.pose([{ clip: p.clip, time: Math.max(0, dt + p.once!), weight: 1 - idle, loop: false }, { clip: 'Idle_Loop', time: tw, weight: idle }]); }
        else p.a.pose([{ clip: p.clip, time: p.once !== undefined ? p.once + dt * 0.6 : tw * (p.speed ? 0.95 : 1) + p.phase!, weight: 1, loop: p.once === undefined }]);
        if (rw > 0 && target) { p.a.root.updateMatrixWorld(true); p.a.lookAt(_t.copy(target), 0.9 * rw, 0); }
        p.a.commit();
      }
    },
  };
}
