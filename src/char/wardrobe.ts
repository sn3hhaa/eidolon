/**
 * The protagonist: CC0 base avatar (head, face rig, hair, hands) + an original wardrobe generated here —
 * oversized cobalt jacket with orange accents, loose cream cargo trousers, custom inline skates.
 * She has no name; in code she is only ever `protagonist` / `the girl`.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon } from '../engine/look';
import { Actor } from './actor';
import { readBody, cutBody, makeShell, garmentMaterial, shellMesh, type ClothUniforms } from './shell';
import { makeSkate, SKATE_LIFT, type Skate } from './skates';
import { transplantHair } from './hair';

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const bump = (x: number, c: number, w: number) => Math.exp(-((x - c) * (x - c)) / (w * w));
const lin = (hex: string) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)})`; };
export const PALETTE = { cobalt: '#1c4ed8', orange: '#ff7a1a', navy: '#16224f', cream: '#f1e6cb', creamDark: '#d9cba8' };

const HEM = 0.865, CUFF = 0.49, NECK = 1.335, WAIST = 0.96, ANKLE = 0.24;   // jacket ends at the hip; trousers end above the boot cuff

const JACKET_GLSL = `
uniform sampler2D uArt;
vec3 garment(vec3 p){
  vec3 cob = ${lin(PALETTE.cobalt)}, org = ${lin(PALETTE.orange)}, nav = ${lin(PALETTE.navy)}, crm = ${lin(PALETTE.cream)};
  float ax = abs(p.x); vec3 c = cob;
  c = mix(c, org, step(.275, ax) * step(ax, .335));                       // sleeve band
  c = mix(c, crm, step(.345, ax) * step(ax, .356));
  float d = p.y - (1.19 - .34 * ax);                                      // chest / back chevron
  if (ax < .215) { c = mix(c, org, step(0., d) * step(d, .032)); c = mix(c, crm, step(.04, d) * step(d, .049)); }
  if (p.z > 0. && ax < .0065 && p.y < 1.36) c = crm * .82;                // zip
  if (p.z > 0. && ax > .095 && ax < .15 && abs(p.y - (.99 - (ax - .095) * .9)) < .004) c = nav; // pocket welts
  if (p.z < 0. && ax < .2) {                                              // back piece (painted art, see jacketArt)
    vec2 uv = vec2((.18 - p.x) / .36, (p.y - .885) / .36);
    if (uv.x > 0. && uv.x < 1. && uv.y > 0. && uv.y < 1.) { vec4 art = texture2D(uArt, uv); c = mix(c, art.rgb, art.a); }
  }
  if (p.z > 0.) { float r = length(p.xy - vec2(.105, 1.25)); c = mix(c, crm, step(r, .034)); c = mix(c, org, step(r, .027)); c = mix(c, nav, step(r, .012)); }   // chest badge
  if (p.y < ${(HEM + 0.002).toFixed(3)}) { c = nav; c = mix(c, org, step(${(HEM - 0.04).toFixed(3)}, p.y) * step(p.y, ${(HEM - 0.024).toFixed(3)})); }      // rib hem
  if (ax > ${(CUFF + 0.002).toFixed(3)}) { c = nav; c = mix(c, org, step(.512, ax) * step(ax, .524)); }       // rib cuffs
  if (p.y > ${(NECK + 0.004).toFixed(3)} && ax < .13) c = mix(cob, org, step(1.398, p.y));                    // collar, orange lip
  return c;
}`;
const TROUSER_GLSL = `
vec3 garment(vec3 p){
  vec3 crm = ${lin(PALETTE.cream)}; vec3 c = crm; float ax = abs(p.x);
  float seam = step(abs(p.y - .585), .0035) + step(abs(p.y - .455), .0035);
  c = mix(c, crm * .72, clamp(seam, 0., 1.) * step(-.01, p.z));           // knee panel seams
  c = mix(c, crm * .72, step(abs(p.z + .004), .003) * step(.1, ax) * step(p.y, .82)); // outer side seam
  if (p.y < ${(ANKLE + 0.002).toFixed(3)}) c = crm * .8;                  // hem
  return c;
}`;

/** Back piece of the jacket: stacked lettering, a bolt and stars, painted once on a canvas. */
function jacketArt() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d')!;
  g.translate(512, 512); g.transform(1, -0.1, 0, 1, 0, 0); g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = (txt: string, y: number, size: number) => { g.font = `900 ${size}px Impact, "Arial Black", sans-serif`; g.fillStyle = PALETTE.orange; g.fillText(txt, 14, y + 14); g.fillStyle = PALETTE.cream; g.fillText(txt, 0, y); };
  word('FAST', -235, 330); word('FORWARD', 40, 235);
  g.fillStyle = PALETTE.orange; for (const x of [-60, 60]) { g.beginPath(); g.moveTo(x - 50, -470); g.lineTo(x + 50, -415); g.lineTo(x - 50, -360); g.closePath(); g.fill(); }
  g.fillStyle = PALETTE.orange; g.fillRect(-380, 195, 760, 34); g.fillStyle = PALETTE.cream; g.fillRect(-380, 245, 760, 12);
  g.fillStyle = PALETTE.cream; g.font = '900 96px Impact, "Arial Black", sans-serif'; g.fillText('SKATE CLUB  ·  EST. 05', 0, 330);
  const bolt = (x: number, y: number, k: number, col: string) => { g.fillStyle = col; g.beginPath(); for (const [px, py] of [[20, -110], [-55, 15], [-5, 15], [-30, 110], [60, -25], [8, -25]]) g.lineTo(x + px * k, y + py * k); g.closePath(); g.fill(); };
  bolt(330, -250, 1.5, PALETTE.cream); bolt(322, -258, 1.5, PALETTE.orange);
  const star = (x: number, y: number, r: number) => { g.fillStyle = PALETTE.cream; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  star(-360, -330, 46); star(-290, -400, 28); star(-400, -420, 20);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export interface Protagonist { actor: Actor; skates: { left: Skate; right: Skate }; cloth: ClothUniforms; lift: number }

export async function buildProtagonist(file: string): Promise<Protagonist> {
  const actor = await Actor.load(file);
  for (const part of ['Tops', 'Bottoms', 'Shoes', 'AccessoryNeck']) for (const m of actor.part(part)) m.visible = false;
  const body = readBody(actor), cloth: ClothUniforms = { uLag: { value: new THREE.Vector3() }, uFlutter: { value: 0 }, uTime: { value: 0 } };

  const jacket = makeShell(body, {
    select: (x, y, _z, bone) => { const ax = Math.abs(x); if (y < HEM - 0.03 || ax > CUFF + 0.03) return false; if (y > NECK + 0.03 && ax < 0.1) return false; return !/Head|Hair/.test(bone); },
    clamp: (p) => { p.y = Math.max(p.y, HEM); if (Math.abs(p.x) > CUFF) p.x = Math.sign(p.x) * CUFF; if (Math.abs(p.x) < 0.1 && p.y > NECK) p.y = NECK; },
    shape: (p, n) => {
      p.addScaledVector(n, 0.02);
      const ax = Math.abs(p.x), a = 0.208, b = 0.158, fade = 1 - ss(1.2, 1.31, p.y), k = Math.hypot(p.x / a, p.z / b);
      let qx = p.x, qz = p.z; if (k < 1 && k > 1e-4) { const f = 1 + (1 / k - 1) * fade; qx *= f; qz *= f; }
      const ry = p.y - 1.262, rz = p.z + 0.004, len = Math.hypot(ry, rz) || 1e-4;
      const R = lerp(0.098, 0.074, ss(0.13, 0.5, ax)) + 0.007 * Math.sin(ax * 85) * bump(ax, 0.33, 0.08) + 0.004 * Math.sin(ax * 120) * bump(ax, 0.46, 0.05);
      const t = ss(0.15, 0.215, ax);
      p.set(lerp(qx, p.x, t), lerp(p.y, 1.262 + (ry / len) * R - 0.012 * t, t), lerp(qz, -0.004 + (rz / len) * R, t));
    },
    loose: (p) => Math.max(ss(1.12, HEM, p.y) * 0.8 * (1 - ss(0.2, 0.26, Math.abs(p.x))), ss(0.22, 0.5, Math.abs(p.x)) * 0.45),
    rebind: (bone) => (/Leg/.test(bone) ? 'Hips' : /Bust/.test(bone) ? 'UpperChest' : /Hand|Thumb|Index|Middle|Ring|Little/.test(bone) ? bone.slice(0, 2) + 'LowerArm' : null),
    smooth: 3,
    bands: [
      { where: (c) => c.y < 0.9, axis: [0, -1, 0], rings: [[0.025, 1.0], [0.045, 0.98], [0.047, 0.9]] },
      { where: (c) => c.x > 0.4, axis: [1, 0, 0], rings: [[0.014, 0.86], [0.05, 0.8], [0.052, 0.6]] },
      { where: (c) => c.x < -0.4, axis: [-1, 0, 0], rings: [[0.014, 0.86], [0.05, 0.8], [0.052, 0.6]] },
      { where: (c) => c.y > 1.3 && Math.abs(c.x) < 0.1, axis: [0, 1, 0], rings: [[0.028, 1.13], [0.07, 1.2], [0.074, 1.1], [0.03, 0.98]] },
    ],
  });
  shellMesh(body, jacket, garmentMaterial(JACKET_GLSL, cloth, { uArt: { value: jacketArt() }, uBias: { value: 0.1 } }));

  const legAxis = (y: number, sx: number): [number, number] => (y > 0.518 ? [sx * lerp(0.057, 0.079, ss(0.518, 0.87, y)), lerp(-0.004, 0.002, ss(0.518, 0.87, y))] : [sx * lerp(0.046, 0.057, ss(0.103, 0.518, y)), lerp(-0.025, -0.004, ss(0.103, 0.518, y))]);
  const trousers = makeShell(body, {
    select: (x, y) => y < WAIST + 0.03 && y > ANKLE - 0.03 && Math.abs(x) < 0.3,
    clamp: (p) => { p.y = Math.min(WAIST, Math.max(ANKLE, p.y)); },
    shape: (p, n) => {
      p.addScaledVector(n, 0.012);
      const sx = p.x >= 0 ? 1 : -1, [axx, axz] = legAxis(p.y, sx), rx = p.x - axx, rz = p.z - axz, len = Math.hypot(rx, rz) || 1e-4;
      const R = 0.1 + 0.016 * ss(0.56, 0.3, p.y) - 0.016 * ss(0.33, ANKLE, p.y) + 0.006 * Math.sin(p.y * 95) * bump(p.y, 0.31, 0.06) + 0.004 * Math.sin(p.y * 70 + Math.atan2(rz, rx) * 2) * bump(p.y, 0.5, 0.08);
      const lx = axx + (rx / len) * R, lz = axz + (rz / len) * R;
      const a = 0.178, b = 0.134, k = Math.hypot(p.x / a, p.z / b), f = k < 1 && k > 1e-4 ? 1 / k : 1, t = ss(0.8, 0.9, p.y);
      p.x = lerp(lx, p.x * f, t); p.z = lerp(lz, p.z * f, t);
    },
    loose: (p) => ss(0.62, ANKLE, p.y) * 0.4,
    smooth: 2,
    bands: [
      { where: (c) => c.y < 0.35, axis: [0, -1, 0], rings: [[0.014, 0.96], [0.026, 0.82], [0.02, 0.6]] },
      { where: (c) => c.y > 0.9, axis: [0, 1, 0], rings: [[0.0, 0.85]] },
    ],
  });
  shellMesh(body, trousers, garmentMaterial(TROUSER_GLSL, cloth));
  // skin that stays visible: neck/head side of the body mesh and the hands
  cutBody(body, (x, y, _z, bone) => (y > NECK - 0.02 && Math.abs(x) < 0.12) || Math.abs(x) > CUFF + 0.025 || /Head|Hair/.test(bone));

  // cargo pockets ride on the thighs
  const crm = toon(PALETTE.cream), crmD = toon(PALETTE.creamDark), org = toon(PALETTE.orange);
  for (const side of [1, -1] as const) {
    const g = new THREE.Group(), add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); };
    add(new RoundedBoxGeometry(0.036, 0.135, 0.115, 3, 0.012), crm, 0, 0, 0);
    add(new RoundedBoxGeometry(0.042, 0.05, 0.123, 3, 0.012), crmD, 0.002 * side, 0.05, 0);
    add(new RoundedBoxGeometry(0.01, 0.03, 0.016, 2, 0.003), org, 0.022 * side, 0.03, 0);
    actor.attach(side === 1 ? 'leftUpperLeg' : 'rightUpperLeg', g, new THREE.Vector3(side * 0.108, -0.2, -0.004));
  }
  const skates = { left: makeSkate(1), right: makeSkate(-1) };
  actor.attach('leftFoot', skates.left.group); actor.attach('rightFoot', skates.right.group);
  // hairstyle: a short tousled cut fitted from another CC0 avatar, rigid on the head (no spring simulation to misbehave)
  await transplantHair(actor, '/assets/cast/ped_e.vrm', '#4a4c72');
  actor.lift = SKATE_LIFT;
  actor.raw.head.scale.setScalar(1.1);            // slightly larger head: younger, more stylized read
  return { actor, skates, cloth, lift: SKATE_LIFT };
}
