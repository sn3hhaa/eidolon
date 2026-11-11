/** Vehicles: lofted cel-shaded cars and the hero bus. +Z forward, +X = the vehicle's left. */
import * as THREE from 'three';
import { toon, paintTex } from '../engine/look';
import { buildCar } from './vehicles/cars';
import { SPECS } from './vehicles/specs';
import { M, makeWheel } from './vehicles/parts';
import type { Vehicle, CarStyle } from './vehicles/types';
export type { Vehicle, CarStyle };
export { makeBus } from './vehicles/bus';
export { makeBicycle, makeScooter } from './vehicles/twowheel';

let checker: THREE.Material | null = null;
const checkerMat = () => (checker ??= toon('#ffffff', { map: paintTex(256, 16, (g, w, h) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#22242c' : '#fbf6e6'; g.fillRect(i * 8, j * 8, 8, 8); } }) }));

export function makeCar(style: CarStyle, color: string, seed = 1, opts: { driver?: boolean } = {}): Vehicle {
  const c = buildCar(SPECS[style], style === 'taxi' ? '#f2b632' : color, seed, !!opts.driver), { bag, sp, at, paint, v } = c, W = sp.wid, half = sp.len / 2;
  const roofMid = (sp.gh[1] + sp.gh[2]) / 2;
  if (style === 'taxi') {
    bag.box(M.lamp(), 0.42, 0.13, 0.16, 0, sp.hgt + 0.07, roofMid + 0.1, 0.04).box(M.dark(), 0.46, 0.03, 0.2, 0, sp.hgt + 0.01, roofMid + 0.1, 0.01);
    for (const s of [1, -1]) bag.add(checkerMat(), new THREE.PlaneGeometry(2.3, 0.075), s * (W / 2 + 0.004), 0.7, -0.1, 0, s * Math.PI / 2, 0);
  }
  if (style === 'pickup') {
    const b0 = -half + 0.12, b1 = sp.gh[0] - 0.06, L = b1 - b0, zc = (b0 + b1) / 2;
    bag.box(M.dark(), W - 0.3, 0.03, L - 0.1, 0, 1.02, zc, 0.01).pair(paint, 0.09, 0.1, L, W / 2 - 0.09, 1.05, zc, 0.03).box(paint, W - 0.1, 0.1, 0.08, 0, 1.05, b0, 0.03).box(paint, W - 0.2, 0.34, 0.07, 0, 1.2, b1 - 0.02, 0.03);
  }
  if (style === 'wagon' || style === 'suv' || style === 'van') {
    const L = sp.gh[2] - sp.gh[1] - 0.3;
    bag.pair(M.dark(), 0.035, 0.035, L, W / 2 - 0.08 - sp.tumble - 0.1, sp.hgt + 0.03, roofMid, 0.012);
    for (const k of [-0.3, 0.3]) bag.box(M.dark(), W - 2 * (0.08 + sp.tumble + 0.1), 0.025, 0.04, 0, sp.hgt + 0.045, roofMid + k * L, 0.01);
  }
  if (style === 'suv') { const w = makeWheel(sp.wr * 0.95, 0.2, 2); w.rotation.y = Math.PI / 2; w.position.set(0.1, at(-half).belt - 0.12, -half - 0.12); v.body.add(w); }
  if (style === 'van') for (const s of [1, -1]) bag.box(M.chrome(), 0.012, 0.02, 1.3, s * (W / 2 + 0.004), 1.0, -0.6, 0.005);
  // lower-body trim line that every style shares (gives the ink pass a waistline)
  const a = at(0); bag.pair(M.dark(), 0.014, 0.03, sp.wb - 2 * sp.wr - 0.3, a.w + 0.003, sp.clear + 0.2, sp.axle ?? 0, 0.006);
  bag.build(v.body);
  return v;
}
