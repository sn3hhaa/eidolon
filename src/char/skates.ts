/** The protagonist's custom inline skates. Built in the character frame with the origin at the ankle joint. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon } from '../engine/look';

/** ankle joint → rest floor (sole of the boot), and → bottom of the wheels */
export const SOLE = 0.103, WHEEL_R = 0.034, SKATE_DROP = SOLE + 0.014 + 0.028 + WHEEL_R;   // 0.183
export const SKATE_LIFT = SKATE_DROP - SOLE;                                             // how much taller she stands
const WHEEL_Z = [-0.07, 0.008, 0.086, 0.164];

export interface Skate { group: THREE.Group; wheels: THREE.Object3D[] }
export function makeSkate(side: 1 | -1): Skate {
  const g = new THREE.Group(), M = { shell: toon('#f4ecd8'), cob: toon('#1d4fd6'), org: toon('#ff7a1a'), dark: toon('#1b2038'), tyre: toon('#ff8a2a'), hub: toon('#fff6e0'), metal: toon('#c9ced8') };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent: THREE.Object3D = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
  const sole = -SOLE;
  // boot: toe box, mid foot, heel cup, ankle cuff, tongue
  add(new RoundedBoxGeometry(0.098, 0.07, 0.16, 5, 0.032), M.shell, 0, sole + 0.04, 0.085);
  add(new THREE.SphereGeometry(0.05, 20, 14).scale(0.98, 0.72, 1.15), M.cob, 0, sole + 0.04, 0.15);                 // toe cap
  add(new RoundedBoxGeometry(0.1, 0.105, 0.12, 5, 0.035), M.shell, 0, sole + 0.056, -0.015);
  add(new THREE.CylinderGeometry(0.056, 0.05, 0.135, 22, 1, true).scale(1, 1, 1.12), M.cob, 0, 0.05, -0.012, -0.1);   // cuff
  add(new THREE.TorusGeometry(0.056, 0.011, 8, 22).scale(1, 1.12, 1), M.org, 0, 0.117, -0.019, Math.PI / 2 - 0.1);   // cuff rim padding
  add(new RoundedBoxGeometry(0.062, 0.15, 0.03, 3, 0.012), M.shell, 0, 0.045, 0.048, -0.32);                          // tongue
  add(new RoundedBoxGeometry(0.108, 0.022, 0.032, 2, 0.008), M.org, 0, sole + 0.092, 0.07, -0.25);                    // instep strap
  add(new RoundedBoxGeometry(0.03, 0.03, 0.04, 2, 0.006), M.metal, side * 0.05, sole + 0.09, 0.07, -0.25);            // buckle
  add(new RoundedBoxGeometry(0.116, 0.026, 0.03, 2, 0.008), M.dark, 0, 0.075, 0.03, -0.2);                            // cuff strap
  add(new RoundedBoxGeometry(0.026, 0.034, 0.036, 2, 0.006), M.org, side * 0.056, 0.075, 0.02, -0.2);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 6), M.cob, 0, sole + 0.079 - i * 0.004, 0.1 + i * 0.022, 0, 0, Math.PI / 2); // laces
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 12), M.org, side * 0.052, 0.02, -0.02, 0, 0, Math.PI / 2);     // cuff pivot bolt
  // soul plate + frame
  add(new RoundedBoxGeometry(0.118, 0.016, 0.262, 2, 0.007), M.dark, 0, sole - 0.007, 0.05);
  const fr = new THREE.Shape(); fr.moveTo(-0.118, 0); fr.lineTo(0.215, 0); fr.lineTo(0.205, -0.018); fr.lineTo(0.19, -0.032); fr.lineTo(-0.094, -0.032); fr.lineTo(-0.108, -0.018); fr.closePath();
  for (const s of [-1, 1]) { const m = add(new THREE.ExtrudeGeometry(fr, { depth: 0.006, bevelEnabled: false }), M.cob, s * 0.017 + 0.003, sole - 0.014, 0, 0, -Math.PI / 2, 0); m.scale.z = 1; }
  add(new THREE.BoxGeometry(0.034, 0.006, 0.3), M.org, 0, sole - 0.017, 0.048);
  const wheels: THREE.Object3D[] = [];
  for (const z of WHEEL_Z) {
    const w = new THREE.Group(); w.position.set(0, -SKATE_DROP + WHEEL_R, z); g.add(w); wheels.push(w);
    add(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.022, 28), M.tyre, 0, 0, 0, 0, 0, Math.PI / 2, w);
    add(new THREE.TorusGeometry(WHEEL_R - 0.006, 0.0065, 8, 28), M.tyre, 0, 0, 0, 0, Math.PI / 2, 0, w);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.026, 6), M.hub, 0, 0, 0, 0, 0, Math.PI / 2, w);                    // hex hub: makes spin readable
    add(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), M.metal, 0, 0, 0, 0, 0, Math.PI / 2, w);
  }
  return { group: g, wheels };
}
