/** Bicycle and parked moped. +Z forward; `userData.wheels` = [front, rear] (spin about local X). */
import * as THREE from 'three';
import { toon } from '../../engine/look';
import { Bag, M } from './parts';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function tube(bag: Bag, mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  bag.add(mat, g);
}
function spokedWheel(r: number, tire: number, rim: THREE.Material): THREE.Group {
  const g = new THREE.Group(), bag = new Bag();
  bag.add(M.tire(), new THREE.TorusGeometry(r - tire, tire, 8, 28), 0, 0, 0, 0, Math.PI / 2, 0);
  bag.add(rim, new THREE.TorusGeometry(r - tire * 2.1, tire * 0.45, 6, 28), 0, 0, 0, 0, Math.PI / 2, 0);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; tube(bag, rim, V(0, 0, 0), V(i % 2 ? 0.012 : -0.012, Math.sin(a) * (r - tire * 2), Math.cos(a) * (r - tire * 2)), 0.004); }
  bag.add(rim, new THREE.CylinderGeometry(0.025, 0.025, 0.07, 10), 0, 0, 0, 0, 0, Math.PI / 2);
  bag.build(g); return g;
}

export function makeBicycle(color: string): THREE.Group {
  const g = new THREE.Group(), bag = new Bag(), p = toon(color), R = 0.34, zf = 0.53, zr = -0.52;
  const bb = V(0, 0.29, -0.08), seat = V(0, 0.86, -0.26), head = V(0, 0.88, 0.36), headLo = V(0, 0.62, 0.42), axF = V(0, R, zf), axR = V(0, R, zr);
  tube(bag, p, bb, seat, 0.018); tube(bag, p, seat, head, 0.016); tube(bag, p, bb, headLo, 0.02); tube(bag, p, head, headLo, 0.02);
  for (const s of [0.05, -0.05]) { tube(bag, p, bb, V(s, R, zr), 0.011); tube(bag, p, V(0, 0.8, -0.24), V(s, R, zr), 0.01); tube(bag, M.chrome(), V(0, 0.62, 0.42), V(s, R, zf), 0.012); }
  tube(bag, M.chrome(), seat, V(0, 0.95, -0.28), 0.012); bag.box(M.dark(), 0.15, 0.05, 0.26, 0, 0.97, -0.3, 0.02);
  tube(bag, M.chrome(), head, V(0, 1.0, 0.33), 0.013); tube(bag, M.chrome(), V(0.27, 1.0, 0.3), V(-0.27, 1.0, 0.3), 0.012);
  for (const s of [0.27, -0.27]) bag.add(M.dark(), new THREE.CylinderGeometry(0.018, 0.018, 0.1, 8), s * 0.85, 1.0, 0.3, 0, 0, Math.PI / 2);
  bag.add(M.chrome(), new THREE.CylinderGeometry(0.09, 0.09, 0.008, 18), 0.05, bb.y, bb.z, 0, 0, Math.PI / 2);
  tube(bag, M.dark(), V(0.06, bb.y, bb.z), V(0.08, bb.y - 0.16, bb.z + 0.04), 0.009); tube(bag, M.dark(), V(-0.06, bb.y, bb.z), V(-0.08, bb.y + 0.16, bb.z - 0.04), 0.009);
  bag.box(M.dark(), 0.09, 0.02, 0.05, 0.12, bb.y - 0.16, bb.z + 0.04, 0.005).box(M.dark(), 0.09, 0.02, 0.05, -0.12, bb.y + 0.16, bb.z - 0.04, 0.005);
  bag.box(p, 0.05, 0.01, 0.5, 0, R * 2 + 0.03, zr + 0.02, 0.004);                    // rear mudguard hint + basket
  bag.box(toon('#a9825a'), 0.3, 0.2, 0.22, 0, 0.9, 0.56, 0.02);
  bag.build(g);
  const wf = spokedWheel(R, 0.02, M.chrome()), wr = spokedWheel(R, 0.02, M.chrome()); wf.position.copy(axF); wr.position.copy(axR); g.add(wf, wr);
  g.userData.wheels = [wf, wr];
  return g;
}

export function makeScooter(color: string): THREE.Group {
  const g = new THREE.Group(), bag = new Bag(), p = toon(color), R = 0.2, zf = 0.62, zr = -0.6;
  bag.box(p, 0.3, 0.07, 0.62, 0, 0.3, 0.02, 0.03);                                   // footboard
  bag.box(p, 0.4, 0.62, 0.1, 0, 0.62, 0.42, 0.05, -0.3);                            // leg shield
  bag.box(p, 0.16, 0.12, 0.44, 0, 0.44, zf, 0.05, 0.25);                            // front mudguard
  bag.box(p, 0.38, 0.4, 0.78, 0, 0.5, -0.5, 0.12);                                  // rear body
  bag.box(M.seat(), 0.32, 0.1, 0.68, 0, 0.76, -0.44, 0.045);
  bag.box(M.dark(), 0.07, 0.6, 0.07, 0, 0.72, 0.56, 0.02, -0.3);                    // steering column
  bag.box(p, 0.3, 0.14, 0.16, 0, 1.02, 0.44, 0.05);
  bag.add(M.lamp(), new THREE.SphereGeometry(0.075, 12, 8), 0, 0.98, 0.53);
  tube(bag, M.dark(), V(0.32, 1.05, 0.4), V(-0.32, 1.05, 0.4), 0.014);
  for (const s of [1, -1]) { tube(bag, M.chrome(), V(s * 0.22, 1.05, 0.4), V(s * 0.3, 1.24, 0.38), 0.006); bag.box(M.chrome(), 0.1, 0.07, 0.015, s * 0.31, 1.26, 0.38, 0.007); }
  bag.box(toon('#b0222c'), 0.14, 0.06, 0.03, 0, 0.62, -0.9, 0.012).box(M.chrome(), 0.05, 0.05, 0.36, 0.2, 0.3, -0.62, 0.02);
  tube(bag, M.dark(), V(0.1, 0.28, -0.1), V(0.24, 0.02, -0.14), 0.01);              // side stand
  bag.build(g);
  const wheels: THREE.Object3D[] = [];
  for (const z of [zf, zr]) { const w = new THREE.Group(), wb = new Bag(); wb.add(M.tire(), new THREE.TorusGeometry(R - 0.055, 0.055, 8, 22), 0, 0, 0, 0, Math.PI / 2, 0).add(M.chrome(), new THREE.CylinderGeometry(R - 0.1, R - 0.1, 0.07, 14), 0, 0, 0, 0, 0, Math.PI / 2); wb.build(w); w.position.set(0, R, z); g.add(w); wheels.push(w); }
  g.userData.wheels = wheels; g.rotation.z = 0;
  return g;
}
