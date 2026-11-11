/** Performance segments E (time is returning), F (stair launch + landing) and G (ending). See perform.ts. */
import * as THREE from 'three';
import { POSE, mix, blend, type SkPose } from '../char/skater';
import { Path, track, integrate, arc, win, sstep, lerp } from './util';
import { CURB, L } from '../world/layout';
import { FACE, faceMix, rootOn, EAR, type Perf } from './perfbase';
import { byDistance, D, BUS } from './perform2';

// ───────────────────────────── E: the High Walk — she notices the world waking, then sprints for the stairs
const TAKE = 72, STAIR_X = 65;
const pathE = new Path([[D.endPos.x, D.endPos.y], [57.7, 33], [58.2, 39], [59.4, 44.5], [62, 50.5], [64.4, 55], [STAIR_X, 57.2], [STAIR_X, L.stairs.zTop], [STAIR_X, 62], [STAIR_X, 66]]);
const dTake = pathE.near(STAIR_X, L.stairs.zTop), vE = track([[0, 0.7], [1.5, 3.3], [6, 6.4], [12, 8.6], [18, 9.5], [dTake, 9.5]], 'l');
const RUN = TAKE - (byDistance(vE, dTake, 0).end), mE = byDistance(vE, dTake, RUN);
export const E = { start: D.end, notice: D.end + 1.2, turn: RUN - 0.8, run: RUN, path: pathE };
const LOOK_BACK = new THREE.Vector3(BUS.x, 2.2, BUS.z);

export function segE(s: number): Perf {
  if (s < RUN) {
    const yawBack = -2.35, yaw = lerp(0, yawBack, sstep(E.notice, E.notice + 1.1, s)) * (1 - sstep(E.turn, RUN - 0.15, s));
    const br = Math.sin((s - E.start) * 5.2), tired = 1 - sstep(E.start + 0.4, E.notice + 0.3, s);
    let pose: SkPose = POSE.stand(); pose.spine = [0.05 + 0.3 * tired + 0.03 * br, 0, 0]; pose.hip = [0, -0.04 - 0.1 * tired, 0]; pose.head = [-0.15 * tired, 0, 0];
    pose.hL = lerp3([0.07, -0.41, 0.03, 0], [0.1, -0.3, 0.16, 0], tired); pose.hR = lerp3([-0.07, -0.41, 0.03, 0], [-0.1, -0.3, 0.16, 0], tired);
    pose = mix(pose, POSE.glide(0.85, -1), sstep(RUN - 0.4, RUN, s));
    const face = s < E.notice ? faceMix(FACE.grin, FACE.breath, 0.5) : faceMix(faceMix(FACE.puzzled, FACE.uhoh, sstep(E.notice + 1.6, E.turn - 0.3, s)), FACE.mischief, sstep(E.turn, RUN, s));
    return { root: { pos: new THREE.Vector3(D.endPos.x, L.highwalk.y, D.endPos.y), yaw }, pose, dist: 0, speed: 0, face, hp: 1, look: s > E.notice - 0.2 && s < E.turn ? LOOK_BACK : undefined, lookW: 0.6 };
  }
  const d = mE.dAt(s), v = mE.vAt(s), root = rootOn(pathE, d, v, L.highwalk.y, 0.6);
  const cad = integrate([[RUN, 1.2], [RUN + 2, 1.65], [80, 1.65]], 0.5)(s);
  const pose = blend([[POSE.glide(0.85, -1), 1 - sstep(RUN, RUN + 0.25, s)], [POSE.stride(cad, 1), sstep(RUN, RUN + 0.25, s) * (1 - sstep(TAKE - 0.5, TAKE - 0.3, s))], [POSE.tuck(), win(s, TAKE - 0.36, TAKE - 0.09, 0.1)], [POSE.launch(), sstep(TAKE - 0.07, TAKE, s)]]);
  return { root, pose, dist: d, speed: v, face: faceMix(FACE.effort, FACE.mischief, 0.5), hp: 1 };
}
const lerp3 = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t));

// ───────────────────────────── F: off the stairs — 540 mute grab — landing — roll-out along the promenade
const AIR = 1.04, LAND = TAKE + AIR, V0 = 9.5;
const pathF = new Path([[STAIR_X, L.stairs.zTop], [STAIR_X, 63], [STAIR_X, 67.9], [64.9, 70.6], [64.1, 73.8], [61.4, 76.4], [56.5, 77.5], [49, 77.7], [40, 77.9], [34, 78.7], [30.8, 79.6], [28.5, 80.2]]);
const dStop = pathF.near(30.8, 79.6), dLand = V0 * AIR;
const vF = track([[0, V0], [dLand, V0], [dLand + 2, 9.0], [22, 7.8], [32, 6], [42, 4], [dStop - 3, 2.2], [dStop, 0.5]], 'l'), mF = byDistance(vF, dStop, TAKE);
export const F = { take: TAKE, apex: TAKE + AIR * 0.36, land: LAND, revert: LAND + 0.75, end: mF.end, path: pathF };

export function segF(s: number): Perf {
  const d = mF.dAt(s), v = mF.vAt(s), air = s < LAND, y = air ? arc(s, TAKE, LAND, L.terrace.y, CURB) : CURB, root = rootOn(pathF, d, air ? 0 : v, y, 0.5);
  // 540°: slow while extended at take-off, fast while tucked, slow again as she opens up; lands fakie, then reverts
  const u = (s - TAKE) / AIR, spin = air ? (0.14 * u + 0.86 * sstep(0.08, 0.92, u)) * 3 * Math.PI : 3 * Math.PI + Math.PI * sstep(F.revert, F.revert + 0.6, s);
  root.spin = spin;
  if (air) root.tumble = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.22 * Math.sin(u * Math.PI), 0, 0.3 * Math.sin(u * Math.PI)));
  const fakie = sstep(LAND + 0.25, LAND + 0.5, s) * (1 - sstep(F.revert, F.revert + 0.5, s)), back = POSE.glide(0.4, -1); back.hL = [0.36, -0.1, 0.02, 0]; back.hR = [-0.36, -0.12, 0.0, 0]; back.head = [-0.2, 0.8, 0]; back.spine = [0.3, 0.25, 0];
  const coast = POSE.glide(0.12, 1); coast.hL = [0.12, -0.36, 0.02, 0]; coast.hR = [-0.12, -0.36, 0.02, 0];
  const pose = blend([
    [POSE.launch(), 1 - sstep(TAKE + 0.02, TAKE + 0.16, s)], [POSE.air(1), win(s, TAKE + 0.12, TAKE + 0.24, 0.08)], [POSE.grab(), win(s, TAKE + 0.24, LAND - 0.3, 0.1)],
    [POSE.reach(), win(s, LAND - 0.26, LAND - 0.04, 0.09)], [POSE.land(), win(s, LAND + 0.03, LAND + 0.2, 0.12)], [back, fakie],
    [POSE.glide(0.3, 1), win(s, F.revert + 0.5, F.revert + 1.6, 0.3)], [coast, sstep(F.revert + 1.4, F.revert + 2.2, s) * (1 - sstep(mF.end - 1.6, mF.end - 0.5, s))], [POSE.brake(), win(s, mF.end - 1.9, mF.end - 0.6, 0.4)], [POSE.stand(), sstep(mF.end - 0.7, mF.end, s)],
  ]);
  const face = air ? FACE.joy : faceMix(FACE.effort, FACE.grin, sstep(LAND + 0.2, LAND + 0.9, s));
  return { root, pose, dist: d, speed: v, face, hp: 1 };
}

// ───────────────────────────── G: breath, a look back, headphones, away
const G0 = pathF.at(dStop), yawG0 = pathF.yaw(dStop), CITY = new THREE.Vector3(63, 7, 48);
const yawCity = yawG0 - ((((yawG0 - Math.atan2(CITY.x - G0.x, CITY.z - G0.y)) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
const pathG = new Path([[G0.x, G0.y], [26, 79.4], [14, 79], [-10, 78.6], [-40, 78.5], [-70, 78.5]]);
/** offsets from F.end */
export const Gs = { up: 1.8, look: 3.2, phones: 6.2, on: 7.1, away: 9.4, pos: G0 };
export function segG(s: number): Perf {
  const t = s - mF.end, vG = integrate([[Gs.away, 0], [Gs.away + 0.6, 2.2], [Gs.away + 2.6, 5], [Gs.away + 60, 5]]), d = t > Gs.away ? vG(t) : 0;
  const yaw = t < Gs.away - 1 ? lerp(yawG0, yawCity, sstep(Gs.up - 0.2, Gs.look, t)) : lerp(yawCity, yawG0 - Math.PI * 2 - 0.25, sstep(Gs.away - 1.1, Gs.away - 0.1, t));
  const root = t > Gs.away ? rootOn(pathG, d, vG.rate(t), CURB) : { pos: new THREE.Vector3(G0.x, CURB, G0.y), yaw };
  const br = Math.sin(t * 5.6) * (1 - sstep(2.5, 6, t)), bent = 1 - sstep(Gs.up - 0.5, Gs.up + 0.5, t);
  let pose: SkPose = POSE.stand(); pose.spine = [0.05 + 0.5 * bent + 0.035 * br, 0, 0]; pose.hip = [0, -0.04 - 0.16 * bent + 0.006 * br, -0.05 * bent]; pose.head = [0.1 * bent, 0, 0];
  if (bent > 0.01) { const k = POSE.stand(); k.hL = [0.14, 0.62, 0.13, 1]; k.hR = [-0.14, 0.62, 0.13, 1]; k.curl = [0.25, 0.25]; k.spine = pose.spine; k.hip = pose.hip; k.head = pose.head; pose = mix(pose, k, bent); }
  const up = win(t, Gs.phones, Gs.on + 0.7, 0.45); if (up > 0) { const e = POSE.stand(); const dy = -0.14 * (1 - sstep(Gs.phones + 0.4, Gs.on, t)); e.hL = EAR(1, dy); e.hR = EAR(-1, dy); e.curl = [0.25, 0.25]; e.head = [0.05, 0, 0]; e.elbow = [0.9, -0.25, -0.35]; pose = mix(pose, e, up); pose.elbow = e.elbow; }
  if (t > Gs.away - 0.5) pose = blend([[pose, 1 - sstep(Gs.away - 0.5, Gs.away, t)], [POSE.glide(0.7, -1), win(t, Gs.away - 0.4, Gs.away + 0.15, 0.2)], [POSE.stride(0.5 + (t - Gs.away) * 0.95, 0.45), sstep(Gs.away + 0.05, Gs.away + 0.4, t)]]);
  const face = t < Gs.up ? FACE.breath : t < Gs.phones ? faceMix(FACE.breath, FACE.smile, sstep(Gs.up, Gs.look + 0.6, t)) : faceMix(FACE.smile, { relaxed: 1 }, sstep(Gs.on, Gs.on + 0.6, t));
  return { root, pose, dist: d, speed: t > Gs.away ? vG.rate(t) : 0, face, hp: 1 - sstep(Gs.on - 0.25, Gs.on + 0.1, t), look: t > Gs.up + 0.3 && t < Gs.away - 1.2 ? CITY : undefined, lookW: 0.7 };
}
