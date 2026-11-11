/**
 * The protagonist's performance as a pure function of STORY time σ (seconds of her own, real-speed time).
 * Shots map film time → σ (with slow motion) and only add cameras. Segments:
 *   A  0‥15.6   prep, push-off, sprint down Main St, jump the roadworks barrier (time freezes mid-air), roll out, stop
 *   B  15.6‥23.5 looks around, finds the suspended basketball, touches it
 *   C  23.5‥45  the frozen playground: slalom, duck under the pigeons, kerb hop, splash plaza, hockey stop
 *   D  45‥60.5  the line: sprint → ledge grind → bank ramp → tilted bus roof → High Walk
 *   E  60.5‥72  realises time is returning, sprints the High Walk and terrace
 *   F  72‥80    stair launch, 540 mute grab, landing, roll-out along the promenade
 *   G  80‥      catches her breath, looks back, headphones on, skates away
 */
import * as THREE from 'three';
import { POSE, mix, seq, type SkPose } from '../char/skater';
import type { Face } from '../char/actor';
import { Path, track, integrate, arc, win, sstep, lerp } from './util';
import { L } from '../world/layout';

export * from './perfbase';
import { FACE, faceMix, rootOn, EAR, EAST, BALL, type Perf } from './perfbase';

// ───────────────────────────── A: prep → sprint → barrier jump → stop
const TAKE_A = L.barrier.x - 1.9;
const vA = integrate([[5.5, 0], [6.2, 2.6], [9.0, 7.5], [10.7, 7.6], [11.4, 7.4], [12.2, 6.2], [14.6, 1.5], [15.6, 0], [30, 0]]);
export const A = { push: 5.5, take: 10.7, land: 11.4, freeze: 11.02, stop: 15.6 };
const pathA = new Path([[TAKE_A - vA(A.take), 3.55], [-45, 3.5], [TAKE_A, 3.4], [-27, 3.4], [-20, 3.7], [-14.5, 4.25], [-11.6, 4.55], [-9, 4.6]]);
const cadA = integrate([[5.5, 1.05], [7, 1.3], [10.3, 1.38]], 0.5);
const headYawA = track([[11.9, 0], [12.5, 0.55], [13.3, 0.5], [14.0, -0.75], [14.8, -0.6], [15.5, 0.2]]);

function segA(s: number): Perf {
  const d = vA(s), v = vA.rate(s), air = s > A.take && s < A.land, y = air ? arc(s, A.take, A.land, 0, 0) : 0;
  const root = rootOn(pathA, d, v, y);
  let pose: SkPose, face: Face = FACE.focus, hp = 0, wheelL = 0, look: THREE.Vector3 | undefined, lookW = 0;
  if (s < A.push) {
    // on the spot: rocking a skate, tugging the bag strap, settling the headphones
    const rock = Math.sin(s * 2.7) * win(s, -1, 2.3, 0.4), st = POSE.stand();
    st.fL = [0.1, 0, 0.05 + 0.075 * rock, 0.1, 0, 0]; st.hip = [-0.025, -0.035, -0.01]; st.hR = [0.1, -0.13, 0.2, 0]; st.curl = [0.35, 0.7]; st.elbow = [0.8, -0.6, -0.1]; wheelL = 0.075 * rock;
    const tug = win(s, 2.1, 3.2, 0.25); st.hR = [0.1 + 0.02 * tug, -0.13 - 0.07 * tug, 0.2, 0]; st.spine = [0.04, 0.06 * tug, 0]; st.head = [0.12 * tug, 0.1 * tug, 0];
    const up = win(s, 3.9, 4.95, 0.42), press = win(s, 4.2, 4.8, 0.12), ears = POSE.stand();
    ears.hL = EAR(1, -0.01 * press); ears.hR = EAR(-1, -0.01 * press); ears.curl = [0.25, 0.25]; ears.head = [0.08 - 0.1 * press, 0.05 * Math.sin(s * 5) * press, 0.04 * press]; ears.spine = [0.02, 0, 0]; ears.elbow = [0.55, -0.85, 0.45]; ears.palmL = [-1, 0, 0.15]; ears.palmR = [1, 0, 0.15];
    pose = mix(st, ears, up); if (up > 0.02) pose.elbow = ears.elbow; if (up > 0.5) { pose.palmL = ears.palmL; pose.palmR = ears.palmR; }
    pose = mix(pose, POSE.glide(0.75, -1), sstep(5.05, 5.5, s));
    face = faceMix(FACE.neutral, FACE.focus, sstep(4.6, 5.3, s));
  } else if (s < A.take - 0.5) {
    pose = mix(POSE.glide(0.75, -1), POSE.stride(cadA(s), track([[5.5, 1], [8, 1], [10, 0.8]])(s)), sstep(5.5, 5.75, s));
  } else if (s < A.land) {
    pose = seq([[A.take - 0.5, () => POSE.stride(cadA(s), 0.8)], [A.take - 0.2, POSE.tuck()], [A.take + 0.02, POSE.launch()], [A.take + 0.28, POSE.air(1)], [A.land - 0.22, POSE.air(1)], [A.land - 0.03, POSE.reach()]], s);
    face = s > A.freeze ? faceMix(FACE.focus, FACE.puzzled, sstep(A.freeze + 0.1, A.land, s)) : FACE.effort;
  } else {
    const gl = POSE.glide(0.22, 1), k = sstep(A.land, A.land + 0.09, s) * (1 - sstep(A.land + 0.12, A.land + 0.75, s));
    pose = mix(mix(POSE.reach(), gl, sstep(A.land, A.land + 0.3, s)), POSE.land(), k);
    pose = mix(pose, POSE.brake(), win(s, 14.1, 15.2, 0.4)); pose = mix(pose, POSE.stand(), sstep(15.0, 15.6, s));
    const off = win(s, 12.55, 13.25, 0.3); if (off > 0) { const e = POSE.glide(0.15, 1); e.hL = EAR(1, -0.07 - 0.08 * sstep(12.9, 13.3, s)); e.hR = EAR(-1, -0.07 - 0.08 * sstep(12.9, 13.3, s)); e.curl = [0.3, 0.3]; e.palmL = [-1, 0, 0.15]; e.palmR = [1, 0, 0.15]; pose = mix(pose, e, off); pose.elbow = [0.55, -0.85, 0.45]; if (off > 0.5) { pose.palmL = e.palmL; pose.palmR = e.palmR; } }
    hp = sstep(12.85, 13.2, s);
    pose.head = [pose.head[0], headYawA(s), 0]; pose.spine = [pose.spine[0], headYawA(s) * 0.35, 0];
    face = faceMix(FACE.puzzled, FACE.surprised, win(s, 13.2, 14.4, 0.4));
  }
  return { root, pose, dist: d, speed: v, face, hp, wheelL, look, lookW };
}

// ───────────────────────────── B: the suspended basketball
const B0 = pathA.at(vA(A.stop)), B1 = new THREE.Vector2(BALL.x - 0.3, BALL.z - 0.37);
/** radians the ball has turned (she nudges it at σ = 20.6) and its tiny drift */

export const BALLT = { leave: 19.9, on: 20.6, flick: 22.15, home: 22.9 };
const KID = new THREE.Vector3(-12.0, 1.2, 7.4);
function segB(s: number): Perf {
  const k = sstep(16.2, 18.2, s), p = B0.clone().lerp(B1, k), faceKid = Math.atan2(KID.x - B1.x, KID.z - B1.y) - 0.35;
  const yaw = lerp(EAST, faceKid, sstep(16.0, 18.0, s)) + lerp(0, EAST - faceKid, sstep(23.0, 23.5, s));
  const sway = Math.sin(s * 1.4);
  // relaxed stance: weight on the left skate, right skate back on its toe wheel side, hips shifted
  const base = POSE.stand(); base.fL = [0.11, 0, 0.07 + 0.05 * k * (1 - k) * 4, 0.3, 0, 0]; base.fR = [-0.1, 0, -0.07, -0.12, 0, 0]; base.hip = [0.035 + 0.01 * sway, -0.055, 0]; base.hipRot = [0, 0, 0.05]; base.spine = [0.03, 0.06, -0.05]; base.hL = [0.2, -0.36, 0.1, 0]; base.hR = [-0.19, -0.42, 0.06, 0];
  // right hand up, index finger as a spindle
  const up = sstep(BALLT.leave - 0.25, BALLT.on - 0.1, s) * (1 - sstep(BALLT.flick + 0.25, BALLT.home, s)), fl = win(s, BALLT.flick - 0.12, BALLT.flick + 0.1, 0.1), dip = win(s, BALLT.on - 0.02, BALLT.on + 0.12, 0.08);
  const hold = POSE.stand(); Object.assign(hold, { fL: base.fL, fR: base.fR, hip: [0.04, -0.06 - 0.03 * dip, 0.01], hipRot: base.hipRot, spine: [0.0 - 0.06 * fl, -0.1 + 0.12 * fl, -0.04], hL: [0.24, -0.3, 0.12, 0] });
  hold.hR = [-0.2 + 0.03 * fl, 0.03 - 0.05 * dip + 0.12 * fl, 0.27 + 0.1 * fl, 0]; hold.curl = [0.35, 0.95]; hold.elbow = [0.45, -1, 0.05]; hold.palmR = [0.3, 0, -1];
  const pose = mix(mix(base, hold, up), POSE.glide(0.7, -1), sstep(23.05, 23.5, s)); if (up > 0.3) { pose.point = [0, 1]; pose.elbow = hold.elbow; pose.palmR = hold.palmR; }
  const onTip = s > BALLT.on && s < BALLT.flick;
  const face = s < BALLT.leave ? faceMix(FACE.neutral, FACE.smile, sstep(16.5, 17.5, s)) : s < BALLT.on ? FACE.surprised : onTip ? faceMix(FACE.surprised, FACE.grin, sstep(BALLT.on, BALLT.on + 0.45, s)) : faceMix(FACE.joy, FACE.mischief, sstep(BALLT.flick + 0.35, BALLT.home, s));
  return { root: { pos: new THREE.Vector3(p.x, 0, p.y), yaw }, pose, dist: vA(A.stop) + k * 0.5, speed: 0, face, hp: 1, look: s > 16.3 && s < 23.0 ? LOOKB : undefined, lookW: 0.75 };
}
/** what she is watching during the ball beat (kept up to date by the stage: the ball itself) */
export const LOOKB = new THREE.Vector3(-12, 1.2, 7.2);

import { segC, segD, C, D, BUS, busRoofY } from './perform2';
import { segE, segF, segG, E, F, Gs } from './perform3';
export { C, D, E, F, Gs, BUS, busRoofY };
export function perform(s: number): Perf {
  return s < A.stop ? segA(s) : s < 23.5 ? segB(s) : s < 45 ? segC(s) : s < D.end ? segD(s) : s < F.take ? segE(s) : s < F.end ? segF(s) : segG(s);
}
