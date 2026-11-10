/**
 * The recurring cast: the Caretaker, the Guide creature, and the Artifact.
 * All are built from the modelling kit and painted by the scene's LightRig, so
 * they keep one design while taking each room's light.
 */
import * as THREE from 'three';
import { LightRig, paint, glow, motes } from '../engine/paint';
import { rng } from '../engine/anim';
import { ball, beads, extrude, finial, gearShape, lathe, merge, mesh, petal, radial, ribbon, ring, scallopShape, surface, tint, tube, v3, xf, TAU } from './geo';

export const PAL = {
  black: '#04040a', navy: '#0a0f3c', cobalt: '#1f3fff', lime: '#b6f03a', coral: '#ff6a4d', orange: '#e8601c', violet: '#5a1fb8',
  hotpink: '#ff3d9a', pink: '#ffb3d1', turquoise: '#2fe6d6', cream: '#f6ead0', gold: '#f2b632', amber: '#ffb347', crimson: '#c8102e',
  emerald: '#0fae6b', indigo: '#1b1464', ivory: '#fff6e0', greengold: '#b9b048',
};

/** A scalloped bell of cloth hanging from yTop. uv.y runs down the cloth so it can flutter. */
function bellCloth(rTop: number, rBot: number, h: number, lobes: number, dip: number) {
  return surface((u, v, P) => {
    const a = u * TAU, fl = Math.pow(v, 0.72);
    const r = (rTop + (rBot - rTop) * fl) * (1 + 0.07 * v * Math.cos(lobes * a));
    P.set(Math.cos(a) * r, -h * v - dip * v * v * (0.5 + 0.5 * Math.cos(lobes * a)), Math.sin(a) * r);
  }, 54, 12);
}

export interface CaretakerPose { walk?: number; stride?: number; reach?: number; headYaw?: number; headPitch?: number; bow?: number; armL?: number }
export interface Caretaker { group: THREE.Group; update(t: number, p?: CaretakerPose): void; lantern: THREE.Object3D; hand: THREE.Object3D }

/**
 * The Caretaker: a slender porcelain-masked keeper under a wide moon-brim hat
 * with a tall spire and floating halo, wearing three scalloped bells of
 * patterned cloth, carrying a lantern staff. ~2.3 units tall, feet at y=0, faces +Z.
 */
export function makeCaretaker(rig: LightRig, o: { simple?: boolean } = {}): Caretaker {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const gold = paint(rig, { color: PAL.gold, gloss: 0.9, rim: 0.8, shade: '#6b3a0a' });
  const cloth = (c: string, accent: string, pattern: any, scale: [number, number], flutter = 0.03) =>
    paint(rig, { color: c, accent, pattern, patternScale: scale, side: THREE.DoubleSide, gloss: 0.15, rim: 0.7, flutter, flutterK: 7, flutterSpeed: 3.2, brush: 0.3 });

  // legs + upturned shoes
  const legG = merge([
    tint(tube([v3(0, 0, 0), v3(0, -0.36, 0.01), v3(0, -0.72, 0)], (u) => 0.04 - 0.012 * u, { radial: 6, seg: 8 }), '#141033'),
    tint(tube([v3(0, -0.75, -0.06), v3(0, -0.76, 0.1), v3(0, -0.7, 0.2), v3(0, -0.6, 0.21)], (u) => 0.055 * (1 - u * 0.85), { radial: 6, seg: 10 }), PAL.coral),
  ]);
  const legM = paint(rig, { vertexColors: true, gloss: 0.5 });
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.07, 0.78, 0); mesh(legG, legM, p); body.add(p); return p; });

  // three bells of cloth
  const tiers = [
    { y: 1.04, g: bellCloth(0.13, 0.56, 0.86, 9, 0.1), m: cloth(PAL.indigo, PAL.gold, 'brocade', [26, 7]) },
    { y: 1.24, g: bellCloth(0.12, 0.42, 0.5, 9, 0.08), m: cloth(PAL.coral, PAL.cream, 'stripes', [27, 1]) },
    { y: 1.38, g: bellCloth(0.06, 0.31, 0.25, 9, 0.06), m: cloth(PAL.cream, PAL.hotpink, 'dots', [18, 3], 0.015) },
  ].map((t) => { const p = new THREE.Group(); p.position.y = t.y; mesh(t.g, t.m, p); body.add(p); return p; });

  // ruff collar + neck
  const ruff = merge(radial(petal({ len: 0.17, width: 0.11, curl: 0.5, cup: 0.3, nu: 4, nv: 5 }), 12, { tilt: 1.25 }));
  mesh(ruff, paint(rig, { color: PAL.hotpink, side: THREE.DoubleSide, rim: 0.8, gloss: 0.2 }), body, [0, 1.385, 0]);
  mesh(lathe([[0.035, 0], [0.028, 0.1]], 8), paint(rig, { color: '#141033' }), body, [0, 1.36, 0]);

  // head: porcelain mask, ink eyes, coral cheeks, gold brow mark
  const head = new THREE.Group(); head.position.set(0, 1.56, 0); body.add(head);
  const mask = xf(lathe([[0.001, -0.16], [0.06, -0.14], [0.108, -0.05], [0.118, 0.03], [0.095, 0.11], [0.05, 0.15], [0.001, 0.165]], 20, 4), { s: [1, 1, 0.92] });
  mesh(mask, paint(rig, { color: PAL.cream, gloss: 1, rim: 0.9, shade: '#8a6f9c', brush: 0.1 }), head);
  const face = merge([
    tint(xf(ball(0.022, 1), { p: [-0.045, 0.015, 0.098], s: [1.25, 0.75, 0.5] }), '#0a0820'),
    tint(xf(ball(0.022, 1), { p: [0.045, 0.015, 0.098], s: [1.25, 0.75, 0.5] }), '#0a0820'),
    tint(xf(ball(0.02, 1), { p: [-0.07, -0.04, 0.08], s: [1, 0.8, 0.4] }), PAL.coral),
    tint(xf(ball(0.02, 1), { p: [0.07, -0.04, 0.08], s: [1, 0.8, 0.4] }), PAL.coral),
    tint(xf(new THREE.OctahedronGeometry(0.016), { p: [0, 0.085, 0.092], s: [0.7, 1.4, 0.4] }), PAL.gold),
  ]);
  mesh(face, paint(rig, { vertexColors: true, gloss: 0.6, bands: 2 }), head);

  // moon-brim hat, spire, halo
  const hat = new THREE.Group(); hat.position.set(0, 0.13, -0.01); hat.rotation.x = -0.12; head.add(hat);
  const brim = lathe([[0.001, 0.12], [0.07, 0.11], [0.12, 0.06], [0.3, 0.025], [0.54, -0.035], [0.56, -0.05], [0.53, -0.06], [0.3, -0.01], [0.1, 0.0], [0.001, 0.0]], 40, 3);
  mesh(brim, paint(rig, { color: '#161049', accent: PAL.gold, pattern: 'rosette', patternScale: [16, 5], gloss: 0.7, rim: 1 }), hat);
  const hatGold = merge([
    ...beads(0.555, 26, 0.016).map((b) => xf(b, { p: [0, -0.05, 0] })),
    xf(finial(0.62, 0.05), { p: [0, 0.1, 0] }),
    xf(ring(0.19, 0.008, 6, 40), { p: [0, 0.5, 0], r: [0.35, 0, 0.2] }),
    xf(ball(0.03, 1), { p: [0, 0.74, 0] }),
  ]);
  mesh(hatGold, gold, hat);
  if (!o.simple) {
    const st = (x: number, c: string, len: number) => mesh(
      ribbon([v3(x, -0.04, -0.5), v3(x * 1.2, -0.3, -0.58), v3(x * 1.3, -len, -0.62)], (u) => 0.05 * (1 - u * 0.5), { seg: 20 }),
      paint(rig, { color: c, side: THREE.DoubleSide, flutter: 0.09, flutterK: 9, flutterSpeed: 4, rim: 0.8 }), hat);
    st(-0.1, PAL.hotpink, 0.95); st(0.12, PAL.turquoise, 0.8);
  }

  // arms: bell sleeves + porcelain hands
  const armG = merge([
    tint(tube([v3(0, 0, 0), v3(0, -0.26, 0), v3(0, -0.5, 0)], (u) => 0.04 + 0.06 * u * u, { radial: 8, seg: 8 }), PAL.coral, PAL.indigo, 'v'),
    tint(xf(ball(0.042, 1), { p: [0, -0.54, 0], s: [0.8, 1.2, 0.8] }), PAL.cream),
  ]);
  const armM = paint(rig, { vertexColors: true, gloss: 0.4, rim: 0.7 });
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.14, 1.32, 0); p.rotation.z = s * 0.22; mesh(armG, armM, p); body.add(p); return p; });
  const hand = new THREE.Object3D(); hand.position.set(0, -0.56, 0); arms[1].add(hand);

  // lantern staff
  const staff = new THREE.Group(); staff.position.set(-0.36, 0, 0.2); g.add(staff);
  const pole = merge([
    lathe([[0.02, 0], [0.016, 0.9], [0.028, 0.95], [0.016, 1.0], [0.014, 1.95], [0.035, 2.0], [0.012, 2.04]], 6),
    xf(ring(0.1, 0.008, 6, 24), { p: [0, 2.16, 0], r: [Math.PI / 2, 0, 0] }),
    xf(ring(0.1, 0.008, 6, 24), { p: [0, 2.16, 0], r: [Math.PI / 2, 0, Math.PI / 2] }),
    xf(ring(0.1, 0.008, 6, 24), { p: [0, 2.16, 0] }),
    xf(finial(0.16, 0.03), { p: [0, 2.26, 0] }),
    xf(extrude(gearShape(8, 0.035, 0.026, 0.012), 0.008, 0), { p: [0.03, 1.9, 0] }),
  ]);
  mesh(pole, gold, staff);
  const lantern = mesh(ball(0.055, 2), glow({ color: PAL.amber, intensity: 4, additive: false }), staff, [0, 2.16, 0]);
  mesh(ball(0.2, 2), glow({ color: PAL.amber, intensity: 0.9, halo: 2.5 }), staff, [0, 2.16, 0]);

  const update = (t: number, p: CaretakerPose = {}) => {
    const ph = (p.walk ?? 0) * TAU, st = p.stride ?? 0, reach = p.reach ?? 0;
    body.position.y = Math.abs(Math.sin(ph)) * 0.035 * st;
    body.rotation.x = (p.bow ?? 0) * 0.35 + 0.03 * st;
    legs[0].rotation.x = Math.sin(ph) * 0.55 * st; legs[1].rotation.x = -Math.sin(ph) * 0.55 * st;
    tiers.forEach((tr, i) => {
      const lag = 0.5 + i * 0.5;
      tr.rotation.x = Math.sin(ph * 2 - lag) * 0.05 * st + Math.sin(t * 1.1 + i) * 0.012 - (p.bow ?? 0) * 0.1;
      tr.rotation.z = Math.sin(ph - lag) * 0.07 * st + Math.sin(t * 0.8 + i * 2) * 0.01;
    });
    arms[1].rotation.x = -reach * 1.55 + Math.sin(ph) * 0.35 * st * (1 - reach);
    arms[1].rotation.z = 0.22 - reach * 0.15;
    arms[0].rotation.x = -(p.armL ?? 0.55) - Math.sin(ph) * 0.05 * st;
    head.rotation.set((p.headPitch ?? 0) + Math.sin(t * 0.7) * 0.025, p.headYaw ?? 0, Math.sin(t * 0.9) * 0.02 + Math.sin(ph) * 0.03 * st);
    staff.rotation.z = Math.sin(t * 0.6) * 0.015; staff.rotation.x = 0.04 + Math.sin(ph * 2) * 0.03 * st;
    staff.position.y = Math.abs(Math.cos(ph)) * 0.04 * st;
  };
  update(0);
  return { group: g, update, lantern, hand };
}

export interface Guide { group: THREE.Group; update(t: number, flap?: number): void }
/**
 * The Guide: a small porcelain seed-bird with four translucent petal wings, a
 * flower-antler crown, one turquoise lamp of an eye and three ribbon tails.
 * ~0.5 long (body) / 1.2 wingspan, faces +Z.
 */
export function makeGuide(rig: LightRig): Guide {
  const g = new THREE.Group();
  const body = merge([
    tint(xf(lathe([[0.001, -0.24], [0.045, -0.19], [0.09, -0.04], [0.075, 0.09], [0.035, 0.19], [0.001, 0.23]], 14, 4), { r: [Math.PI / 2, 0, 0] }), PAL.pink, PAL.cream, 'z'),
    tint(xf(ball(0.07, 2), { p: [0, 0.035, 0.2] }), PAL.cream),
    tint(xf(lathe([[0.02, 0], [0.001, 0.07]], 6), { r: [Math.PI / 2, 0, 0], p: [0, 0.015, 0.265] }), PAL.gold),
    ...[-1, 0, 1].map((i) => tint(xf(petal({ len: 0.16, width: 0.07, curl: -0.5, nu: 3, nv: 5 }), { r: [-0.5, 0, i * 0.5], p: [i * 0.02, 0.09, 0.17] }), PAL.hotpink)),
    ...[-1, 1].map((s) => tint(tube([v3(s * 0.03, 0.09, 0.2), v3(s * 0.09, 0.2, 0.19), v3(s * 0.16, 0.24, 0.15), v3(s * 0.17, 0.31, 0.13)], 0.007, { radial: 5, seg: 10 }), PAL.gold)),
    ...[-1, 1].map((s) => tint(xf(ball(0.018, 1), { p: [s * 0.17, 0.32, 0.13] }), PAL.amber)),
  ]);
  mesh(body, paint(rig, { vertexColors: true, gloss: 0.95, rim: 1, accent: PAL.turquoise, pattern: 'dots', patternScale: [10, 8], patternMix: 0.7, side: THREE.DoubleSide }), g);
  mesh(ball(0.03, 1), glow({ color: PAL.turquoise, intensity: 5, additive: false }), g, [0.04, 0.05, 0.245]);
  mesh(ball(0.03, 1), glow({ color: PAL.turquoise, intensity: 5, additive: false }), g, [-0.04, 0.05, 0.245]);
  mesh(ball(0.3, 2), glow({ color: PAL.turquoise, intensity: 0.5, halo: 3 }), g, [0, 0.03, 0.1]);
  const wingM = paint(rig, { color: PAL.hotpink, accent: PAL.cream, pattern: 'veins', patternScale: 9, glass: true, opacity: 0.55, gloss: 0.8, rim: 1.2, emissive: PAL.hotpink, emissiveIntensity: 0.35 });
  const wings: THREE.Group[] = [];
  [[0.62, 0.3, 0.05, 0.25], [0.42, 0.2, -0.08, -0.5]].forEach(([len, w, z, sweep]) => [-1, 1].forEach((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.05, 0.05, z);
    const wg = xf(petal({ len, width: w, curl: 0.25, cup: 0.1, tip: 0.8 }), { r: [-Math.PI / 2, 0, 0] }); // lie flat, pointing +Y→ then rotate out
    const m = mesh(xf(wg, { r: [0, 0, -s * Math.PI / 2] }), wingM, p); m.rotation.y = -s * sweep;
    g.add(p); wings.push(p);
  }));
  const tails = [PAL.turquoise, PAL.hotpink, PAL.amber].map((c, i) => mesh(
    ribbon([v3((i - 1) * 0.03, 0, -0.2), v3((i - 1) * 0.1, -0.03, -0.6), v3((i - 1) * 0.22, 0.02, -1.15)], (u) => 0.045 * (1 - u * 0.7), { seg: 24 }),
    paint(rig, { color: c, side: THREE.DoubleSide, flutter: 0.12, flutterK: 10, flutterSpeed: 7, rim: 1, emissive: c, emissiveIntensity: 0.25 }), g));
  void tails;
  const update = (t: number, flap = 13) => {
    wings.forEach((w, i) => { const s = i % 2 ? 1 : -1, lag = i < 2 ? 0 : 0.9; w.rotation.z = s * (0.15 + 0.75 * Math.sin(t * flap - lag)); });
    g.children[0].rotation.x = Math.sin(t * 2.1) * 0.06;
  };
  update(0);
  return { group: g, update };
}

export interface Artifact { group: THREE.Group; update(t: number, o?: { pulse?: number; keeper?: boolean }): void; core: THREE.Vector3; inner: THREE.Group }
/**
 * The Artifact: a tall glass egg in a gilt claw cradle, girdled by a toothed
 * equator ring and six beaded meridians, crowned with a petal finial. Inside,
 * a tiny island world turns under its own sun and moon. ~4.4 tall, base y=0.
 */
export function makeArtifact(rig: LightRig): Artifact {
  const g = new THREE.Group();
  const eggProfile: [number, number][] = [[0.001, 0.85], [0.45, 0.95], [0.86, 1.4], [1.05, 2.1], [0.98, 2.75], [0.7, 3.3], [0.34, 3.62], [0.001, 3.7]];
  const prof = new THREE.SplineCurve(eggProfile.map(([r, y]) => new THREE.Vector2(r, y)));
  const gold = paint(rig, { color: PAL.gold, gloss: 0.95, rim: 0.9, shade: '#5e2f08', accent: '#fff0b0', pattern: 'bands', patternScale: [1, 30], patternMix: 0.5 });

  // plinth
  mesh(lathe([[1.5, 0], [1.5, 0.08], [1.25, 0.14], [1.3, 0.22], [0.8, 0.34], [0.62, 0.5], [0.75, 0.6], [0.5, 0.72], [0.3, 0.8]], 36, 3),
    paint(rig, { color: '#101a5c', accent: PAL.gold, pattern: 'brocade', patternScale: [40, 6], gloss: 0.8, rim: 0.8, patternMix: 0.8 }), g);
  // cradle claws, meridians, crown, bead rows
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 14; k++) { const p = prof.getPoint(0.03 + (k / 14) * 0.94); pts.push(v3(Math.cos(a) * (p.x + 0.03), p.y, Math.sin(a) * (p.x + 0.03))); }
    parts.push(tube(pts, i % 2 ? 0.014 : 0.024, { radial: 5, seg: 40 }));
    if (i % 2 === 0) {
      const b = a + TAU / 12;
      parts.push(tube([v3(Math.cos(b) * 1.15, 0.2, Math.sin(b) * 1.15), v3(Math.cos(b) * 1.45, 0.75, Math.sin(b) * 1.45), v3(Math.cos(b) * 1.3, 1.5, Math.sin(b) * 1.3), v3(Math.cos(b) * 1.1, 1.95, Math.sin(b) * 1.1), v3(Math.cos(b) * 1.22, 2.2, Math.sin(b) * 1.22)],
        (u) => 0.07 * (1 - u * 0.75), { radial: 6, seg: 24 }));
      parts.push(xf(ball(0.06, 1), { p: [Math.cos(b) * 1.22, 2.22, Math.sin(b) * 1.22] }));
    }
  }
  parts.push(xf(finial(0.75, 0.13), { p: [0, 3.68, 0] }));
  parts.push(...radial(petal({ len: 0.42, width: 0.2, curl: 0.7, cup: 0.25, nu: 4, nv: 6 }), 8, { tilt: 0.9, y: 3.66 }));
  parts.push(...beads(0.72, 28, 0.022).map((b) => xf(b, { p: [0, 3.3, 0] })));
  parts.push(xf(extrude(scallopShape(12, 1.22, 0.07, 1.12), 0.05, 0.01), { r: [Math.PI / 2, 0, 0], p: [0, 0.16, 0] }));
  mesh(merge(parts), gold, g);
  const equator = mesh(xf(extrude(gearShape(36, 1.2, 1.13, 1.07), 0.06, 0.01, 4), { r: [Math.PI / 2, 0, 0] }), gold, g, [0, 2.12, 0]);

  // the tiny world
  const inner = new THREE.Group(); inner.position.set(0, 2.05, 0); g.add(inner);
  const isle = merge([
    tint(lathe([[0.001, -0.62], [0.08, -0.45], [0.2, -0.3], [0.3, -0.12], [0.52, -0.03], [0.55, 0.0], [0.4, 0.03], [0.001, 0.06]], 18, 3), PAL.indigo, PAL.turquoise, 'y'),
    ...[[0, 0, 0.5, 0.06], [0.22, 0.1, 0.32, 0.045], [-0.2, -0.12, 0.38, 0.05], [-0.05, 0.27, 0.24, 0.04], [0.12, -0.26, 0.28, 0.04], [-0.3, 0.15, 0.2, 0.035]]
      .map(([x, z, h, r], i) => tint(xf(finial(h, r), { p: [x, 0.03, z] }), [PAL.cream, PAL.coral, PAL.pink, PAL.cream, PAL.amber, PAL.hotpink][i])),
    tint(xf(extrude(archShape2(0.2, 0.26, 0.03), 0.04, 0.005), { p: [0.3, 0.02, -0.1], r: [0, 0.6, 0] }), PAL.cream),
    ...radial(tint(petal({ len: 0.14, width: 0.07, curl: 0.6, nu: 3, nv: 4 }), PAL.lime), 7, { tilt: 0.7, y: 0.0 }).map((p) => xf(p, { p: [-0.33, 0.06, -0.18] })),
  ]);
  const isleM = paint(rig, { vertexColors: true, gloss: 0.7, rim: 0.9, emissive: '#2a3cff', emissiveIntensity: 0.12, fog: false });
  const island = mesh(isle, isleM, inner);
  const orbit = new THREE.Group(); orbit.rotation.set(0.5, 0, 0.25); inner.add(orbit);
  mesh(ring(0.72, 0.006, 5, 64), gold, orbit);
  const sun = mesh(ball(0.07, 2), glow({ color: PAL.amber, intensity: 6, additive: false }), orbit, [0.72, 0, 0]);
  mesh(ball(0.2, 2), glow({ color: PAL.amber, intensity: 1.2, halo: 2.5 }), sun);
  mesh(ball(0.045, 2), paint(rig, { color: PAL.cream, gloss: 1, fog: false, emissive: PAL.cream, emissiveIntensity: 0.3 }), orbit, [-0.72, 0, 0]);
  const R = rng(77);
  const dust = motes(rig, 160, (_, v) => { v.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(0.2 + R() * 0.65); v.y *= 1.5; }, { color: PAL.cream, color2: PAL.hotpink, size: 0.022, drift: 0.05, intensity: 2 });
  inner.add(dust);
  const keeper = makeCaretaker(rig, { simple: true }); keeper.group.scale.setScalar(0.15); keeper.group.position.set(0.1, 0.05, 0.2); keeper.group.visible = false;
  island.add(keeper.group);
  const coreM = glow({ color: PAL.hotpink, intensity: 0.0, halo: 1.6 });
  mesh(ball(0.34, 3), coreM, inner).position.y = -0.25;

  // glass shell (drawn after the world inside it)
  const shell = mesh(lathe(eggProfile, 48, 6), paint(rig, { color: '#5f86ff', glass: true, opacity: 0.1, gloss: 1, rim: 1.4, accent: PAL.cream, pattern: 'bands', patternScale: [1, 14], patternMix: 0.12, fog: false }), g);
  shell.renderOrder = 5;

  const update = (t: number, o: { pulse?: number; keeper?: boolean } = {}) => {
    island.rotation.y = t * 0.25; orbit.rotation.y = t * 0.9; equator.rotation.y = -t * 0.12;
    inner.position.y = 2.05 + Math.sin(t * 0.8) * 0.03;
    coreM.uniforms.uI.value = 0.12 + 0.05 * Math.sin(t * 1.6) + (o.pulse ?? 0) * 0.9;
    keeper.group.visible = !!o.keeper;
    if (o.keeper) keeper.update(t, { reach: 0.3 + 0.2 * Math.sin(t * 0.8), headPitch: -0.2 });
  };
  update(0);
  return { group: g, update, core: v3(0, 2.1, 0), inner };
}

function archShape2(w: number, h: number, t: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h * 0.5); s.quadraticCurveTo(-w / 2, h, 0, h); s.quadraticCurveTo(w / 2, h, w / 2, h * 0.5); s.lineTo(w / 2, 0);
  s.lineTo(w / 2 - t, 0); s.lineTo(w / 2 - t, h * 0.5); s.quadraticCurveTo(w / 2 - t, h - t, 0, h - t); s.quadraticCurveTo(-w / 2 + t, h - t, -w / 2 + t, h * 0.5); s.lineTo(-w / 2 + t, 0);
  s.closePath();
  return s;
}
