/**
 * 00:00–00:10 — THE ROOM THAT BREATHES.
 * A black-and-cobalt rotunda of breathing ribs. The Caretaker touches the
 * dreaming Artifact; a luminous crack races across the inlaid floor, climbs a
 * sealed arch and splits it open onto the Corridor of Living Portraits.
 */
import * as THREE from 'three';
import { LightRig, paint, glow, motes, backdrop } from '../engine/paint';
import { camPath, pulse, rng, sramp, track, lerp, easeIn, ramp } from '../engine/anim';
import { defaultLook } from '../engine/post';
import type { Built } from '../engine/film';
import { archShape, ball, beads, column, extrude, finial, gearShape, instances, lathe, merge, mesh, petal, radial, ring, scallopShape, starShape, tint, tube, v3, xf, TAU } from '../kit/geo';
import { PAL, makeArtifact, makeCaretaker } from '../kit/cast';

/** The chamber set, shared with the final scene (s9). */
export function buildChamber(rig: LightRig) {
  const root = new THREE.Group(), R = rng(11);
  const NCOL = 12, RAD = 15.5, H = 34;

  // floor: inlaid enamel disc with gilt rings
  const floor = mesh(new THREE.CircleGeometry(24, 96).rotateX(-Math.PI / 2), paint(rig, { color: '#04061c', accent: '#1428a8', pattern: 'brocade', patternScale: 46, patternMix: 0.5, gloss: 0.25, rim: 0.2, brush: 0.35, wear: 0.4 }), root);
  floor.position.y = 0;
  const inlay = merge([
    xf(extrude(scallopShape(24, 2.4, 0.06, 2.25), 0.02, 0), { r: [Math.PI / 2, 0, 0] }),
    xf(extrude(scallopShape(36, 6.0, 0.03, 5.9), 0.02, 0), { r: [Math.PI / 2, 0, 0] }),
    xf(extrude(starShape(12, 12.6, 11.75, 11.6), 0.02, 0), { r: [Math.PI / 2, 0, 0] }),
    ...beads(4.2, 36, 0.05),
  ]);
  mesh(inlay, paint(rig, { color: '#8e6a1e', gloss: 0.9, shade: '#1a1206' }), root, [0, 0.015, 0]);

  // columns (breathing) + ribs to the oculus
  const colM = paint(rig, { color: '#080d3a', accent: '#2a4cff', pattern: 'scales', patternScale: [16, 120], patternMix: 0.4, wobble: 0.05, wobbleFreq: 0.35, gloss: 0.4, rim: 0.55, emissivePattern: 0 });
  const ang = (i: number) => ((i + 0.5) / NCOL) * TAU + Math.PI / 2; // leaves a gap centred on +Z
  instances(column(H, 0.75, 20), colM, NCOL, (i, d) => { d.position.set(Math.cos(ang(i)) * RAD, 0, Math.sin(ang(i)) * RAD); }, root);
  const ribs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < NCOL; i++) {
    const a = ang(i), c = Math.cos(a), s = Math.sin(a);
    ribs.push(tube([v3(c * RAD, H - 0.5, s * RAD), v3(c * 14.5, H + 5, s * 14.5), v3(c * 10.5, H + 10, s * 10.5), v3(c * 5, H + 13, s * 5), v3(c * 2.6, H + 13.6, s * 2.6)], (u) => 0.75 - 0.5 * u, { radial: 8, seg: 28 }));
    // a secondary vertebra-like rib halfway
    const a2 = a + TAU / NCOL / 2, c2 = Math.cos(a2), s2 = Math.sin(a2);
    ribs.push(tube([v3(c2 * 16.4, 22, s2 * 16.4), v3(c2 * 15.6, 30, s2 * 15.6), v3(c2 * 12.5, 39, s2 * 12.5), v3(c2 * 6.5, 45.5, s2 * 6.5)], (u) => 0.3 - 0.18 * u, { radial: 6, seg: 24 }));
  }
  ribs.push(xf(ring(2.6, 0.45, 10, 48), { p: [0, H + 13.6, 0] }));
  mesh(merge(ribs), colM, root);

  // wall drum behind the columns + gallery rings with scalloped valances
  mesh(new THREE.CylinderGeometry(17.2, 17.2, 50, 72, 1, true).translate(0, 25, 0), paint(rig, { color: '#03051c', accent: '#0f1f88', pattern: 'filigree', patternScale: [26, 12], patternMix: 0.5, side: THREE.BackSide, wobble: 0.08, wobbleFreq: 0.25, gloss: 0.2, rim: 0 }), root);
  const gal: THREE.BufferGeometry[] = [];
  for (const y of [11, 21.5, 32]) {
    gal.push(xf(extrude(scallopShape(48, 16.2, 0.025, 15.0), 0.25, 0.04, 2), { r: [Math.PI / 2, 0, 0], p: [0, y, 0] }));
    gal.push(...beads(15.0, 96, 0.09).map((b) => xf(b, { p: [0, y - 0.3, 0] })));
  }
  mesh(merge(gal), paint(rig, { color: '#0e1a66', accent: PAL.gold, pattern: 'bands', patternScale: [1, 40], gloss: 0.8, rim: 1 }), root);

  // curved shelves between the columns, stocked with small impossible things
  const shelves: THREE.BufferGeometry[] = [];
  const slots: [number, number, number][] = [];
  for (let i = 0; i < NCOL; i++) {
    if (i === NCOL - 1 || i === 0) { /* keep shelves but skip the arch bay (between col 11 and col 0 … +Z) */ }
    const a0 = ang(i) + 0.09, a1 = ang(i + 1) - 0.09;
    const mid = (a0 + a1) / 2;
    if (Math.abs(Math.atan2(Math.sin(mid - Math.PI / 2), Math.cos(mid - Math.PI / 2))) < 0.2) continue; // the +Z bay holds the arch
    for (const y of [2.2, 4.4, 6.6, 8.8]) {
      const g = new THREE.RingGeometry(15.4, 16.7, 14, 1, a0, a1 - a0).rotateX(-Math.PI / 2); // ring → XZ plane
      shelves.push(xf(g, { p: [0, y, 0], s: [1, 1, -1] }));
      for (let k = 0; k < 6; k++) { const a = lerp(a0, a1, (k + 0.5) / 6); slots.push([Math.cos(a) * 16, y, Math.sin(a) * 16]); }
    }
  }
  mesh(merge(shelves), paint(rig, { color: '#0a1150', side: THREE.DoubleSide, gloss: 0.6, rim: 0.5 }), root);
  const curios = [
    lathe([[0.12, 0], [0.3, 0.2], [0.34, 0.5], [0.1, 0.8], [0.16, 1.0], [0.06, 1.05]], 12, 3),
    finial(1.2, 0.2),
    merge([xf(new THREE.OctahedronGeometry(0.32), { p: [0, 0.5, 0] }), xf(ring(0.45, 0.02, 5, 24), { p: [0, 0.5, 0], r: [0.5, 0, 0.3] }), lathe([[0.15, 0], [0.04, 0.2]], 8)]),
    merge([xf(extrude(gearShape(10, 0.38, 0.3, 0.1), 0.08, 0.01, 4), { p: [0, 0.5, 0] }), lathe([[0.18, 0], [0.03, 0.15]], 8)]),
  ];
  const jewel = ['#2a48ff', '#16268c', '#3b2a9e', '#1d6fd6', PAL.cream, PAL.hotpink, '#16268c', '#2a48ff', PAL.amber, '#0e1a66'];
  curios.forEach((cg, ci) => {
    const mine = slots.filter((_, k) => k % curios.length === ci);
    instances(cg, paint(rig, { gloss: 0.85, rim: 1, pattern: ci === 0 ? 'stripes' : ci === 1 ? 'bands' : 'none', accent: PAL.cream, patternScale: [10, 9], patternMix: 0.35 }), mine.length, (k, d, c) => {
      d.position.set(...mine[k]); d.rotation.y = R() * TAU; d.scale.setScalar(R.range(0.7, 1.25)); c.set(jewel[Math.floor(R() * jewel.length)]);
    }, root);
  });

  // the sealed arch in the +Z bay
  const arch = new THREE.Group(); arch.position.set(0, 0, 16.3); arch.rotation.y = Math.PI; root.add(arch);
  mesh(merge([
    extrude(archShape(6.4, 11.5, 0.6), 0.9, 0.08),
    ...beads(1, 1, 0.001),
    xf(finial(2.6, 0.4), { p: [0, 11.4, 0] }),
    ...[-1, 1].map((s) => xf(finial(1.6, 0.3), { p: [s * 3.1, 6.0, 0] })),
  ]), paint(rig, { color: '#1a2ea0', accent: PAL.gold, pattern: 'brocade', patternScale: 2.2, gloss: 0.8, rim: 1.2, patternMix: 0.85 }), arch);
  mesh(extrude(archShape(5.4, 10.6, 0), 0.3, 0), paint(rig, { color: '#050828', accent: '#1f37c4', pattern: 'scales', patternScale: [1.1, 1.1], patternMix: 0.6, gloss: 0.3, rim: 0.2 }), arch, [0, 0, 0.2]);
  mesh(merge([
    xf(extrude(scallopShape(16, 1.5, 0.12, 1.2), 0.12, 0.03), { p: [0, 4.4, 0] }),
    xf(extrude(starShape(8, 1.05, 0.5, 0.25), 0.1, 0.02), { p: [0, 4.4, 0] }),
    ...[2.0, 6.9, 8.3].map((y, i) => xf(extrude(scallopShape(10, 0.5 - i * 0.08, 0.15, 0.3 - i * 0.06), 0.1, 0.02), { p: [0, y, 0] })),
  ]), paint(rig, { color: PAL.gold, gloss: 0.9, rim: 1, shade: '#4a2408' }), arch, [0, 0, 0.42]);

  // hanging lamps on long threads
  const lampG = merge([
    tint(lathe([[0.02, 0.9], [0.1, 0.8], [0.45, 0.35], [0.55, 0], [0.42, -0.08]], 16, 3), PAL.hotpink),
    ...radial(tint(petal({ len: 0.7, width: 0.3, curl: -0.7, cup: 0.3, nu: 4, nv: 6 }), '#7a1fd0'), 7, { tilt: 2.6, y: 0.0, radius: 0.3 }),
    tint(xf(finial(0.7, 0.09), { r: [Math.PI, 0, 0], p: [0, -0.1, 0] }), PAL.gold),
    tint(tube([v3(0, 0.9, 0), v3(0, 30, 0)], 0.012, { radial: 4, seg: 2 }), '#2a3a9e'),
  ]);
  const lampM = paint(rig, { vertexColors: true, glass: true, opacity: 0.6, gloss: 0.9, rim: 1.2, emissive: PAL.hotpink, emissiveIntensity: 0.22 });
  const lamps: { g: THREE.Group; ph: number }[] = [];
  const lampGlow = glow({ color: PAL.amber, intensity: 4.5, additive: false }), lampHalo = glow({ color: '#ff7ab0', intensity: 0.6, halo: 2.2 });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + R() * 0.4, r = R.range(4.5, 12), y = R.range(7, 20);
    const pivot = new THREE.Group(); pivot.position.set(Math.cos(a) * r, y + 30, Math.sin(a) * r);
    const lg = new THREE.Group(); lg.position.y = -30; lg.scale.setScalar(R.range(0.8, 1.5)); pivot.add(lg);
    mesh(lampG, lampM, lg); mesh(ball(0.14, 2), lampGlow, lg, [0, 0.25, 0]); mesh(ball(0.75, 2), lampHalo, lg, [0, 0.25, 0]);
    root.add(pivot); lamps.push({ g: pivot, ph: R() * TAU });
  }

  // suspended sculptures: a slow armillary of toothed rings, and drifting curios
  const arm = new THREE.Group(); arm.position.set(0, 17, 0); root.add(arm);
  const armM = paint(rig, { color: '#b8892a', accent: '#fff0b0', pattern: 'bands', patternScale: [1, 60], gloss: 0.95, rim: 1, shade: '#231405' });
  const rings = [5.2, 4.2, 3.2].map((r, i) => {
    const m = mesh(merge([extrude(gearShape(Math.round(r * 9), r, r - 0.14, r - 0.34), 0.12, 0.02, 3), ...beads(r - 0.5, 12, 0.08).map((b) => xf(b, { r: [Math.PI / 2, 0, 0] }))]), armM, arm);
    m.rotation.set(0.5 + i * 0.7, i * 1.1, 0); return m;
  });
  mesh(merge([xf(new THREE.OctahedronGeometry(0.9, 0), { s: [0.7, 1.5, 0.7] }), ...radial(petal({ len: 1.2, width: 0.45, curl: 0.5 }), 6, { tilt: 1.2 })]), paint(rig, { color: PAL.cream, gloss: 1, rim: 1.3, side: THREE.DoubleSide, shade: '#2a2f8e' }), arm);
  const floaters: { m: THREE.Object3D; p: THREE.Vector3; ph: number }[] = [];
  const crescent = (() => { const s = new THREE.Shape(); s.absarc(0, 0, 1, -1.9, 1.9, false); s.absarc(0.55, 0, 0.82, 1.45, -1.45, true); return extrude(s, 0.14, 0.03, 20); })();
  const fl = [crescent, curios[2], curios[0], xf(finial(1.6, 0.26), { p: [0, -0.8, 0] }), merge(radial(petal({ len: 0.8, width: 0.34, curl: 0.4, cup: 0.3 }), 9, { tilt: 1.0 }))];
  for (let i = 0; i < 16; i++) {
    const a = R() * TAU, r = R.range(5.5, 12.5), p = v3(Math.cos(a) * r, R.range(3.5, 15), Math.sin(a) * r);
    const m = mesh(fl[i % fl.length], paint(rig, { color: [PAL.cream, '#2a48ff', PAL.hotpink, '#1d6fd6', PAL.amber, '#3b2a9e'][i % 6], gloss: 0.9, rim: 1.2, side: THREE.DoubleSide, pattern: i % 3 === 0 ? 'stripes' : 'none', accent: '#0a0f3c', patternScale: 9, patternMix: 0.5 }), root);
    m.scale.setScalar(R.range(0.6, 1.5)); floaters.push({ m, p, ph: R() * TAU });
  }

  // oculus light + shaft, dust
  mesh(new THREE.CircleGeometry(2.5, 32).rotateX(Math.PI / 2), glow({ color: '#7fa0ff', intensity: 2.2, additive: false }), root, [0, H + 14, 0]);
  const shaft = mesh(new THREE.CylinderGeometry(2.3, 5.5, H + 14, 32, 1, true).translate(0, (H + 14) / 2, 0), glow({ color: '#3a5cff', intensity: 0.16, halo: 1.6, side: THREE.DoubleSide }), root);
  root.add(motes(rig, 700, (_, v) => { const a = R() * TAU, r = Math.sqrt(R()) * 15; v.set(Math.cos(a) * r, R() * 26, Math.sin(a) * r); }, { color: '#ffd9a0', color2: '#8fb0ff', size: 0.07, drift: 0.6, intensity: 1.3, seed: 3 }));
  root.add(backdrop('#04082c', '#010106'));

  const update = (t: number, wake: number) => {
    lamps.forEach((l, i) => { l.g.rotation.z = Math.sin(t * 0.7 + l.ph) * (0.012 + 0.03 * wake); l.g.rotation.x = Math.cos(t * 0.55 + l.ph * 2 + i) * (0.01 + 0.03 * wake); });
    rings.forEach((r, i) => { r.rotation.x = 0.5 + i * 0.7 + t * (0.08 + 0.05 * i) * (i % 2 ? -1 : 1) + wake * i; r.rotation.y = i * 1.1 + t * 0.06; });
    arm.rotation.y = t * 0.05; arm.position.y = 17 + Math.sin(t * 0.5) * 0.3;
    floaters.forEach((f, i) => { f.m.position.set(f.p.x, f.p.y + Math.sin(t * 0.45 + f.ph) * 0.35 + wake * (1.5 + (i % 4)), f.p.z); f.m.rotation.set(t * 0.1 + f.ph + wake * 2 * Math.sin(f.ph), t * 0.14 * (i % 2 ? 1 : -1) + f.ph, f.ph); });
    (colM.uniforms.uEmisPat.value as number) = wake * 0.5;
    (shaft.material as THREE.ShaderMaterial).uniforms.uI.value = 0.16 + 0.03 * Math.sin(t * 0.9);
  };
  return { root, update };
}

export function build(): Built {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 500);
  const rig = new LightRig().key([-0.3, 1, 0.25], '#4660ff', 0.5).ambient('#0a1a80', '#020210', 0.14).rim('#5f8cff', 0.8).shadow('#05042a').fog('#01020e', 0.012);
  const chamber = buildChamber(rig); scene.add(chamber.root);
  const artifact = makeArtifact(rig); scene.add(artifact.group);
  const keeper = makeCaretaker(rig); scene.add(keeper.group);

  // the luminous crack: floor run, then up the sealed arch
  const R = rng(5), pts: THREE.Vector3[] = [];
  const FLOOR_N = 150, WALL_N = 60, N = FLOOR_N + WALL_N + 1;
  let wx = 0;
  for (let i = 0; i <= FLOOR_N; i++) { const k = i / FLOOR_N; wx = wx * 0.82 + (R() - 0.5) * 0.34; pts.push(v3((wx + Math.sin(k * 9) * 0.45) * Math.sin(k * Math.PI), 0.03, 1.5 + k * 14.35)); }
  for (let i = 1; i <= WALL_N; i++) { const k = i / WALL_N; wx = wx * 0.8 + (R() - 0.5) * 0.2; pts.push(v3(wx * (1 - k), 0.03 + k * 9.6, 15.83)); }
  const crackGeo = (wmul: number) => {
    const Q = rng(9), pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, N - 1)], onWall = i > FLOOR_N;
      const dir = b.clone().sub(a).normalize(), perp = onWall ? v3(1, 0, 0) : v3(dir.z, 0, -dir.x);
      const w = (0.025 + 0.06 * Q() * Q()) * wmul * (i === 0 || i === N - 1 ? 0.1 : 1), off = onWall ? -0.005 * wmul : 0;
      pos.push(pts[i].x - perp.x * w, pts[i].y + (onWall ? 0 : 0.002 * wmul), pts[i].z - perp.z * w + off, pts[i].x + perp.x * w, pts[i].y + (onWall ? 0 : 0.002 * wmul), pts[i].z + perp.z * w + off);
      uv.push(0, i / (N - 1), 1, i / (N - 1));
      if (i < N - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    let base = N * 2;
    for (let f = 0; f < 46; f++) { // side fissures, some forking again
      const i0 = 4 + Math.floor(Q() * (N - 12)), p0 = pts[i0], onWall = i0 > FLOOR_N, side = Q.sign(), len = Q.range(0.4, 2.6) * (onWall ? 0.6 : 1), a = Q.range(0.5, 1.3) * side;
      let x = 0, z = 0;
      for (let k = 0; k <= 8; k++) {
        const q = k / 8, w = 0.035 * (1 - q) * wmul; x = Math.sin(a) * len * q + (Q() - 0.5) * 0.12; z = Math.cos(a) * len * q;
        if (onWall) pos.push(p0.x + x - w, p0.y + z * 0.6, p0.z - 0.004 * wmul, p0.x + x + w, p0.y + z * 0.6, p0.z - 0.004 * wmul);
        else pos.push(p0.x + x - w, 0.03, p0.z + z, p0.x + x + w, 0.03, p0.z + z);
        const vv = i0 / (N - 1) + q * 0.04; uv.push(0, vv, 1, vv);
        if (k < 8) idx.push(base + k * 2, base + k * 2 + 2, base + k * 2 + 1, base + k * 2 + 1, base + k * 2 + 2, base + k * 2 + 3);
      }
      base += 18;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  };
  const crackMat = (soft: number) => new THREE.ShaderMaterial({
    uniforms: { uHead: { value: 0 }, uTime: rig.u.uTime, uSoft: { value: soft } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uHead, uTime, uSoft; varying vec2 vUv;
      void main(){ if(vUv.y > uHead) discard; float h = exp(-(uHead-vUv.y)*22.); float core = 1.-abs(vUv.x-.5)*2.;
        vec3 c = mix(vec3(1.,.04,.42), vec3(1.,.55,.12), clamp(h*1.2 + .22*sin(vUv.y*160.-uTime*5.), 0., 1.));
        float a = mix(1., core*core*.32, uSoft);
        gl_FragColor = vec4(c*(1.25+3.2*h)*mix(1., a, uSoft), a); }`,
    side: THREE.DoubleSide, transparent: soft > 0, depthWrite: soft === 0, blending: soft > 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const crackM = crackMat(0), crackM2 = crackMat(1);
  const crack = new THREE.Mesh(crackGeo(1), crackM), crackGlow = new THREE.Mesh(crackGeo(7), crackM2);
  crack.frustumCulled = crackGlow.frustumCulled = false; scene.add(crack, crackGlow);
  const curve = new THREE.CatmullRomCurve3(pts);

  const cam = camPath([
    [0.0, -5.5, 1.3, 12.6, 0.8, 5.6, 0, 52],
    [3.2, -4.6, 2.0, 9.6, 0.4, 4.2, 0, 46],
    [5.6, -3.4, 2.5, 6.4, 0.5, 2.3, 0.6, 36],
    [6.6, -3.0, 2.4, 6.0, 0.5, 1.6, 1.6, 36],
    [7.6, -1.9, 1.9, 4.4, 0.1, 0.3, 9.5, 42],
    [9.2, -0.3, 1.6, 10.2, 0, 3.4, 16, 46],
    [10.5, 0, 3.4, 14.9, 0, 3.9, 17, 50],
  ]);
  const walk = track([[0, 3.6, 13.5], [1.2, 3.2, 11.4], [4.4, 1.25, 2.55], [4.9, 1.05, 2.1]]);
  const focus = track([[0, 20], [3.2, 12], [5.6, 6.5], [8, 6], [10.5, 3]]);
  const look = { ...defaultLook(), bloom: 0.4, contrast: 1.12, vignette: 0.7, tint: [0.003, 0.005, 0.03] as [number, number, number] };
  const hv = new THREE.Vector3();

  return {
    scene, camera, rig, look,
    update(t) {
      const wake = sramp(t, 5.6, 9.5);
      const p = pulse(t, 3.3, 0.45) * 0.55 + pulse(t, 5.55, 0.5) + wake * 0.5;
      chamber.update(t, wake);
      rig.breath = 1 + wake * 3.5;
      artifact.update(t, { pulse: p });
      rig.point(0, [0, 2.2, 0], '#ff6ab0', 1.1 + p * 3, 15);
      // caretaker walks in, reaches, touches
      const w = walk(t), w2 = walk(t + 0.05);
      keeper.group.position.set(w[0], 0, w[1]);
      const moving = Math.hypot(w2[0] - w[0], w2[1] - w[1]) / 0.05;
      keeper.group.rotation.y = Math.atan2(-w[0], -w[1] + 0.3) ;
      keeper.update(t, { walk: (15.5 - w[1]) * 0.5, stride: Math.min(1, moving / 2), reach: sramp(t, 4.3, 5.4) * (1 - sramp(t, 6.4, 7.6) * 0.6), headPitch: -0.25 * sramp(t, 3, 5), headYaw: sramp(t, 6.2, 7.2) * 0.9 });
      keeper.lantern.getWorldPosition(hv);
      rig.point(2, hv, PAL.amber, 1.6, 6);
      // crack
      const head = t < 8.7 ? easeIn(ramp(t, 5.7, 8.7), 1.35) * (150 / 210) : 150 / 210 + sramp(t, 8.7, 9.7) * (60 / 210);
      crackM.uniforms.uHead.value = crackM2.uniforms.uHead.value = head;
      crack.visible = crackGlow.visible = head > 0;
      curve.getPoint(Math.min(head, 0.999), hv); hv.y += 0.5;
      rig.point(1, hv, '#ff4fa0', head > 0 ? 3.2 : 0, 7);
      rig.point(3, [-6, 12, -5], '#ff3d9a', 0.5, 14);
      cam(camera, t);
      look.focus = focus(t)[0]; look.focusRange = 26;
    },
    portal(t) {
      const k = sramp(t, 9.5, 10.45);
      return { center: v3(0, 4.2, 16.2), radius: 0.05 + 7 * k * k, stretch: [0.22 + 0.6 * k, 1.5], rim: '#ffb0d0', rimI: 2.5, occlude: false };
    },
  };
}
