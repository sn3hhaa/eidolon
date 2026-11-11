/** Things that hang in the air when time stops: fountain droplets, the basketball, birds, leaves, spilled oranges. Pure functions of world time. */
import * as THREE from 'three';
import { flat, toon } from '../engine/look';
import { makeBird, makeBasketball, makeOrange, makeCrate, makeLeaf, makeFrisbee, makeKite, makeNewspaperSheet, type Bird } from '../world/props';
import { CURB, L } from '../world/layout';
import { hash, G, arc } from './util';
import { twAt } from './traffic';
import { C, E, F, BALLT, LOOKB } from './perform';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();

export function buildNature() {
  const group = new THREE.Group();
  // ── splash-pad droplets: every jet's arc is permanently filled, so freezing tw leaves the water hanging
  const jets = L.splash.jets, PER = 120, MIST = 520, ND = jets.length * PER + MIST;
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), flat('#bfe9ff'), ND), glints = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), flat('#ffffff'), ND);
  drops.frustumCulled = glints.frustumCulled = false; drops.castShadow = true; group.add(drops, glints);
  const dropAt = (i: number, tw: number, out: THREE.Vector3) => {
    if (i >= jets.length * PER) { const k = i - jets.length * PER, a = hash(k * 1.7) * 6.283, r = Math.sqrt(hash(k * 2.9)) * 4.6, h = 2.9; out.set(L.splash.pad.x + Math.cos(a) * r, CURB + 0.05 + (((hash(k * 4.3) * h - tw * (0.5 + hash(k) * 0.4)) % h) + h) % h, L.splash.pad.z + Math.sin(a) * r); return 0.006 + 0.008 * hash(k * 7.7); }
    const j = Math.floor(i / PER), k = i % PER, [jx, jz] = jets[j], T0 = 1.26, u = (((tw / T0 + k / PER + hash(k * 12.7 + j) * 0.6) % 1) + 1) % 1, born = tw - u * T0;
    const v = 6.2 * (0.8 + 0.2 * Math.sin(born * 1.4 + j * 1.9)), age = u * T0, ox = jx - L.splash.pad.x, oz = jz - L.splash.pad.z, ol = Math.hypot(ox, oz) || 1, lean = 0.3 + 0.9 * hash(k * 3.3 + j);
    const y = v * age - 0.5 * G * age * age; out.set(jx + (ox / ol) * lean * age + (hash(k * 5.1 + j) - 0.5) * 0.5 * age, CURB + 0.04 + Math.max(0, y), jz + (oz / ol) * lean * age + (hash(k * 9.7 + j) - 0.5) * 0.5 * age);
    return y < 0 ? 0 : 0.011 + 0.017 * hash(k * 6.1 + j * 3.3);
  };
  // ── the basketball
  const BALL = new THREE.Vector3(-11.0, 1.6, 5.15);
  const ball = makeBasketball(); ball.castShadow = true; group.add(ball);
  const V0 = new THREE.Vector3(1.82, -3.51, -3.9), REL = -0.55, HAND = new THREE.Vector3(-12.0, 2.05, 7.3), FLOOR = CURB + 0.12;
  const VP = new THREE.Vector3(-0.25, -3.51, 0.9), tB = (-3.51 + Math.sqrt(3.51 * 3.51 + 2 * G * (BALL.y - FLOOR))) / G, PB = new THREE.Vector3(BALL.x + VP.x * tB, FLOOR, BALL.z + VP.z * tB), VB = new THREE.Vector3(-1.02, 0.78 * (3.51 + G * tB), 1.98), tCatch = 0.8;
  const CATCH = new THREE.Vector3(PB.x + VB.x * tCatch, FLOOR + VB.y * tCatch - 0.5 * G * tCatch * tCatch, PB.z + VB.z * tCatch);
  const HOME = new THREE.Vector3(-11.75, 0, 7.0);
  const ballAt = (dt: number, out: THREE.Vector3) => {
    if (dt <= REL) return out.copy(HAND);
    if (dt <= 0) return out.copy(BALL).addScaledVector(V0, dt).setY(BALL.y + V0.y * dt - 0.5 * G * dt * dt);
    if (dt < tB) return out.copy(BALL).addScaledVector(VP, dt).setY(BALL.y + VP.y * dt - 0.5 * G * dt * dt);
    const u = dt - tB; if (u < tCatch) return out.copy(PB).addScaledVector(VB, u).setY(FLOOR + VB.y * u - 0.5 * G * u * u);
    const b = Math.max(0, Math.abs(Math.sin((u - tCatch) * 5.2)) * 0.5 * Math.exp(-(u - tCatch) * 0.1));   // the owner dribbles it
    return out.copy(CATCH).setY(FLOOR + (CATCH.y - FLOOR) * b * 2 * 0.9 + 0.02);
  };
  // ── birds: [bird, frozen position, velocity, kind of path]
  const birds: { b: Bird; p: THREE.Vector3; v: THREE.Vector3; perch: number; gull?: [number, number, number, number]; ref: number }[] = []; let flockRef = C.duck - 0.35;
  const addBird = (kind: 'pigeon' | 'gull', p: THREE.Vector3, v: THREE.Vector3, perch = 0, gull?: [number, number, number, number]) => { const b = makeBird(kind, birds.length + 1); group.add(b.group); birds.push({ b, p, v, perch, gull, ref: flockRef }); };
  for (let i = 0; i < 16; i++) { const a = hash(i * 3.7) * 6.283, r = 0.5 + hash(i * 1.9) * 2.1, x = 8.3 + Math.cos(a) * r * 1.2, z = 1.9 + Math.sin(a) * r * 0.75, mid = Math.abs(z - 1.9) < 0.55; addBird('pigeon', new THREE.Vector3(x, (mid ? 1.42 : 0.75) + hash(i * 5.3) * 1.25, z), new THREE.Vector3(Math.cos(a) * (1.5 + hash(i) * 2), 1.6 + hash(i * 7) * 1.6, Math.sin(a) * (1.5 + hash(i * 2) * 2) - 1.2), 0.5 + hash(i * 4.1) * 0.5); }
  flockRef = E.notice + 0.6;
  for (let i = 0; i < 5; i++) addBird('pigeon', new THREE.Vector3(56.22 + hash(i) * 0.1, L.highwalk.y + L.highwalk.beam.h + 0.1 + (i > 2 ? 0.35 + i * 0.12 : 0), 31.5 + i * 0.75), new THREE.Vector3(-2 - i * 0.4, 2.2 + hash(i * 3) * 1.2, 1.5 - i), i > 2 ? 0.4 : 0);
  flockRef = F.take - 0.4;
  for (let i = 0; i < 9; i++) addBird('pigeon', new THREE.Vector3(60 + hash(i * 2.3) * 12, CURB + 0.12, 66.5 + hash(i * 4.9) * 7), new THREE.Vector3((hash(i * 6.1) - 0.5) * 5, 3 + hash(i * 1.3) * 2, 2 + hash(i * 8.3) * 3), 0);
  for (let i = 0; i < 9; i++) addBird('gull', new THREE.Vector3(), new THREE.Vector3(), 1, [30 + hash(i * 3.1) * 70, 86 + hash(i * 5.9) * 40, 14 + hash(i * 2.2) * 26, 8 + hash(i * 7.3) * 12]);
  // ── leaves drifting down along the street and plazas
  const leaves: THREE.InstancedMesh[] = [], LN = 16;
  for (let k = 0; k < 5; k++) { const src = makeLeaf(k + 1), im = new THREE.InstancedMesh(src.geometry, src.material, LN); im.frustumCulled = false; group.add(im); leaves.push(im); }
  // ── the grocer's spill
  const crate = makeCrate(); crate.position.set(-9.0, 0.98, -7.35); crate.rotation.set(0.9, 0.4, -0.7); group.add(crate);
  const oranges = Array.from({ length: 10 }, (_, i) => { const o = makeOrange(); o.castShadow = true; group.add(o); return { o, p: new THREE.Vector3(-8.9 + hash(i * 2.1) * 1.7, 0.55 + hash(i * 3.3) * 1.15, -7.3 + hash(i * 5.7) * 1.5), v: new THREE.Vector3(0.6 + hash(i) * 1.6, 0.4 + hash(i * 9) * 1.8, 1.2 + hash(i * 4) * 1.2) }; });
  const frisbee = makeFrisbee('#ff5a3c'); group.add(frisbee);
  const kite = makeKite(); kite.position.set(19, 12.5, 30); kite.scale.setScalar(1.6); group.add(kite);
  const papers = [0, 1].map((i) => { const m = makeNewspaperSheet(i + 1); group.add(m); return m; });
  let key = '';
  return {
    group, ball, catchPoint: CATCH,
    set(tw: number, sigma: number, tremble = 0, tf = 0, avoid?: THREE.Vector3, tip?: THREE.Vector3) {
      const jit = (i: number, a: number) => a * tremble * Math.sin(tf * 67 + i * 1.7) * Math.sin(tf * 41 + i * 0.9);
      // the owner dribbles; the ball gets away, she catches it on a fingertip, spins it, flicks it back
      { const B = BALLT, drib = (s: number) => HOME.clone().setY(FLOOR + 0.02 + 0.8 * Math.abs(Math.sin(s * 5.2))), T = tip ?? BALL;
        if (sigma > B.leave && sigma < B.on) { const a = drib(B.leave), k2 = (sigma - B.leave) / (B.on - B.leave); ball.position.lerpVectors(a, T, k2).setY(arc(sigma, B.leave, B.on, a.y, T.y)); }
        else if (sigma >= B.on && sigma < B.flick) ball.position.copy(T);
        else if (sigma >= B.flick && sigma < B.home) { const b = drib(B.home), k2 = (sigma - B.flick) / (B.home - B.flick); ball.position.lerpVectors(T, b, k2).setY(arc(sigma, B.flick, B.home, T.y, b.y)); }
        else ball.position.copy(drib(sigma));
        LOOKB.copy(ball.position);
        if (sigma >= B.on && sigma < B.flick) { ball.rotation.set(0.12, sigma * 19, 0.1); } else       ball.rotation.set(sigma * 6, sigma * 1.3, 0.3); }
      const k = `${tw.toFixed(4)}|${tremble > 0 ? tf.toFixed(4) : ''}|${avoid ? Math.round(avoid.x * 5) + ',' + Math.round(avoid.y * 5) + ',' + Math.round(avoid.z * 5) : ''}`; if (k === key) return; key = k;
      for (let i = 0; i < ND; i++) { const r = dropAt(i, tw, _p); _p.x += jit(i, 0.012); _p.y += jit(i + 7, 0.012); _m.compose(_p, _q.identity(), _s.set(r, r * 1.25, r)); drops.setMatrixAt(i, _m); _p.x += r * 0.42; _p.y += r * 0.55; _p.z += r * 0.2; _m.compose(_p, _q, _s.setScalar(r * 0.36)); glints.setMatrixAt(i, _m); }
      drops.instanceMatrix.needsUpdate = glints.instanceMatrix.needsUpdate = true;
      birds.forEach((d, i) => {
        if (d.gull) { const [cx, cz, r, h] = d.gull, a = i * 1.3 + tw * (0.35 + hash(i) * 0.2) * (i % 2 ? 1 : -1); d.b.group.position.set(cx + Math.cos(a) * r, h + Math.sin(tw * 0.7 + i) * 0.6, cz + Math.sin(a) * r); d.b.group.rotation.set(0, -a + (i % 2 ? 0 : Math.PI), (i % 2 ? -1 : 1) * 0.3); d.b.pose(tw * 2.2 + i * 0.37, 0.75); return; }
        const bt = tw - twAt(d.ref), u = d.perch > 0 ? Math.max(bt, -d.perch) : Math.max(bt, 0), up = bt > -d.perch && (d.perch > 0 || bt > 0);
        d.b.group.position.copy(d.p).addScaledVector(d.v, u); d.b.group.position.y = Math.max(d.b.group.position.y + jit(i, 0.01), d.perch > 0 ? 0.08 : d.p.y);
        d.b.group.rotation.set(up ? -0.5 : 0, Math.atan2(d.v.x, d.v.z) + jit(i + 3, 0.12), jit(i + 5, 0.12)); d.b.pose(up ? tw * 7.5 + i * 0.41 : 0.28, 0);
      });
      leaves.forEach((im, kk) => { for (let i = 0; i < LN; i++) { const n = kk * LN + i, h = 5.2, x = -62 + hash(n * 1.3) * 104, z = (hash(n * 2.9) < 0.6 ? 2.5 + hash(n * 4.1) * 7 : 10 + hash(n * 4.1) * 14); _p.set(x + Math.sin(tw * 0.9 + n) * 0.5 - tw * 0.25 + jit(n, 0.01), 0.1 + (((hash(n * 6.7) * h - tw * (0.45 + hash(n) * 0.3)) % h) + h) % h, z + Math.cos(tw * 0.7 + n * 2) * 0.4); _m.compose(_p, _q.setFromEuler(_e.set(tw * 1.9 + n, tw * 1.1 + n * 2, n)), _s.setScalar(avoid && _p.distanceToSquared(avoid) < 2.2 ? 0 : 1.0)); im.setMatrixAt(i, _m); } im.instanceMatrix.needsUpdate = true; });
      oranges.forEach(({ o }) => { o.visible = false; }); crate.visible = false;
      { const ft = (((tw % 5) + 5) % 5) - 2.5; frisbee.position.set(-14 + 3.2 * ft, 1.9 + 0.5 * Math.cos(ft * 0.9), 17 - 1.6 * ft); } frisbee.rotation.set(0.12, tw * 14, 0.2);
      kite.rotation.set(-0.5 + Math.sin(tw * 0.8) * 0.08, 0.6, Math.sin(tw * 1.1) * 0.12); kite.position.x = 19 + Math.sin(tw * 0.5) * 0.8;
      papers.forEach((m, i) => { m.position.set(-47 + i * 9 - 1.8 * ((((tw + i * 7) % 14) + 14) % 14 - 7), 0.7 + i * 0.5 + Math.sin(tw * 1.4 + i) * 0.3, 8.5 + i * 0.4); m.rotation.set(tw * 1.3 + i, tw * 0.9, i); });
    },
  };
}
