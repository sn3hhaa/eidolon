/** Bus trim: faces, destination boards, lamps, mirrors, roof furniture, seats and passenger silhouettes. */
import * as THREE from 'three';
import { toon, paintTex, rng } from '../../engine/look';
import { Bag, M, plateGeo, plateMat } from './parts';
import { BUS, DOORS } from './bus';

interface Mats { cream: THREE.Material; teal: THREE.Material; orange: THREE.Material; roof: THREE.Material; glass: THREE.Material; tail: THREE.Material; amb: { l: THREE.Material; r: THREE.Material } }
let board: THREE.Material | null = null, boardSmall: THREE.Material | null = null;
const led = (txt: string, w: number, h: number, font: number) => toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25, map: paintTex(w, h, (g) => {
  g.fillStyle = '#17181d'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffb632'; g.font = `bold ${font}px ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 2);
  g.fillStyle = 'rgba(23,24,29,0.35)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
}) });
const PASSENGER = ['#4b4658', '#5a4a4a', '#3f5360', '#5d5046', '#46505a'];

export function busDetails(bag: Bag, m: Mats) {
  const half = BUS.len / 2, HW = BUS.wid / 2, F = half, R = -half;
  board ??= led('27 HARBOR LOOP', 512, 80, 54); boardSmall ??= led('27', 128, 80, 60);
  // ---- front face
  bag.box(m.glass, 2.2, 1.28, 0.04, 0, 1.88, F + 0.005, 0.015).box(M.dark(), 2.3, 1.38, 0.03, 0, 1.88, F - 0.008, 0.02).box(M.dark(), 0.05, 1.28, 0.05, 0, 1.88, F + 0.012, 0.01);
  bag.add(board, new THREE.PlaneGeometry(1.9, 0.3), 0, 2.74, F + 0.022).box(M.dark(), 2.0, 0.38, 0.03, 0, 2.74, F, 0.02);
  bag.box(m.teal, 2.38, 0.17, 0.02, 0, 1.045, F + 0.002, 0.005).box(m.orange, 2.38, 0.05, 0.02, 0, 1.155, F + 0.003, 0.005);
  bag.pair(M.chrome(), 0.36, 0.2, 0.03, 0.86, 0.74, F, 0.04).pair(M.lamp(), 0.2, 0.14, 0.05, 0.92, 0.74, F + 0.004, 0.04);
  bag.box(m.amb.l, 0.11, 0.12, 0.05, 0.73, 0.74, F + 0.004, 0.03).box(m.amb.r, 0.11, 0.12, 0.05, -0.73, 0.74, F + 0.004, 0.03);
  bag.box(M.dark(), 2.5, 0.22, 0.22, 0, 0.47, F - 0.03, 0.06).box(M.dark(), 1.0, 0.14, 0.03, 0, 0.76, F + 0.002, 0.02);
  bag.add(plateMat(27), plateGeo(), 0, 0.47, F + 0.085);
  for (const s of [1, -1]) {                                                         // wipers and big bus mirrors
    bag.box(M.dark(), 0.02, 0.6, 0.02, s * 0.5, 1.5, F + 0.035, 0.006, 0, 0, s * 0.5);
    bag.box(M.dark(), 0.03, 0.03, 0.34, s * (HW - 0.02), 2.62, F + 0.13, 0.01).box(M.dark(), 0.03, 0.5, 0.03, s * (HW + 0.03), 2.38, F + 0.3, 0.01, 0, 0, s * -0.12).box(M.dark(), 0.2, 0.36, 0.07, s * (HW + 0.07), 2.05, F + 0.3, 0.03);
  }
  // ---- rear face
  bag.box(m.glass, 2.0, 0.66, 0.04, 0, 2.0, R - 0.005, 0.015).box(M.dark(), 2.1, 0.76, 0.03, 0, 2.0, R + 0.008, 0.02);
  bag.add(boardSmall, new THREE.PlaneGeometry(0.5, 0.28), 0.6, 2.72, R - 0.022, 0, Math.PI, 0).box(M.dark(), 0.58, 0.34, 0.03, 0.6, 2.72, R, 0.02);
  bag.box(M.dark(), 1.7, 0.4, 0.03, 0, 0.76, R - 0.002, 0.03);
  for (let i = 0; i < 4; i++) bag.box(M.interior(), 1.56, 0.035, 0.02, 0, 0.63 + i * 0.09, R - 0.02, 0.008);
  bag.pair(m.tail, 0.14, 0.36, 0.05, 1.08, 1.32, R - 0.004, 0.03).box(m.amb.l, 0.14, 0.16, 0.05, 1.08, 1.62, R - 0.004, 0.03).box(m.amb.r, 0.14, 0.16, 0.05, -1.08, 1.62, R - 0.004, 0.03);
  bag.box(m.teal, 2.38, 0.17, 0.02, 0, 1.045, R - 0.002, 0.005).box(m.orange, 2.38, 0.05, 0.02, 0, 1.155, R - 0.003, 0.005).box(M.dark(), 2.5, 0.22, 0.2, 0, 0.47, R + 0.03, 0.06);
  bag.add(plateMat(27), plateGeo(), 0, 0.47, R - 0.075, 0, Math.PI, 0);
  // ---- roof: clean deck, two low AC pods in the front third, slim gutter rails
  bag.box(m.roof, 1.5, 0.1, 1.25, 0, BUS.roofY + 0.045, 2.65, 0.04).box(m.roof, 1.5, 0.1, 1.25, 0, BUS.roofY + 0.045, 4.3, 0.04);
  for (const z of [2.65, 4.3]) for (let i = -2; i <= 2; i++) bag.box(M.dark(), 0.2, 0.012, 0.9, i * 0.27, BUS.roofY + 0.098, z, 0.004);
  bag.pair(m.cream, 0.04, 0.035, BUS.len - 0.9, HW - 0.2, BUS.roofY + 0.005, 0, 0.012);
  // ---- sides: skirt panel lines, fuel flap, door sills, side route board
  for (const z of [-4.3, -1.5, 1.4]) for (const s of [1, -1]) if (!(s < 0 && DOORS.some(([a, b]) => z > a && z < b))) bag.box(M.dark(), 0.012, 0.5, 0.014, s * (HW + 0.002), 0.68, z, 0.004);
  bag.box(M.dark(), 0.012, 0.22, 0.26, HW + 0.002, 0.72, -3.9, 0.004);
  for (const [a, b] of DOORS) bag.box(M.chrome(), 0.05, 0.04, b - a - 0.1, -(HW + 0.005), BUS.clear + 0.08, (a + b) / 2, 0.012);
  bag.add(boardSmall, new THREE.PlaneGeometry(0.42, 0.24), -(HW + 0.004), 2.5, 3.1, 0, -Math.PI / 2, 0);
  // ---- interior: floor, seat rows, grab rail, driver and passenger silhouettes
  bag.seg = 1;
  bag.box(M.interior(), BUS.wid - 0.14, 0.1, BUS.len - 0.5, 0, 0.92, 0, 0.02);
  const pm = PASSENGER.map((c) => toon(c));
  const R2 = rng(2727), seat = toon('#2f6f8f');
  for (let z = -4.5; z <= 3.0; z += 0.82) for (const s of [1, -1]) {
    if (s < 0 && DOORS.some(([a, b]) => z > a - 0.5 && z < b + 0.35)) continue;
    const x = s * (HW - 0.48);
    bag.box(seat, 0.8, 0.12, 0.44, x, 1.36, z, 0.04).box(seat, 0.8, 0.62, 0.1, x, 1.7, z - 0.22, 0.04, -0.08);
    for (const dx of [0.2, -0.2]) if (R2() < 0.5) {
      const c = R2.pick(pm), px = x + s * dx, lean = R2.range(-0.06, 0.06);
      bag.add(c, new THREE.SphereGeometry(0.105, 10, 7), px + lean, 2.02 + R2.range(-0.04, 0.03), z - 0.04).box(c, 0.36, 0.5, 0.22, px, 1.66, z - 0.08, 0.09);
    }
  }
  for (const s of [1, -1]) bag.box(M.chrome(), 0.025, 0.025, BUS.len - 1.4, s * 0.42, 2.62, -0.2, 0.01);
  const dc = toon('#3d4a66');                                                       // driver, front left
  bag.add(dc, new THREE.SphereGeometry(0.11, 12, 9), 0.72, 2.0, 4.42).box(dc, 0.42, 0.52, 0.24, 0.72, 1.62, 4.38, 0.1).box(seat, 0.5, 0.7, 0.1, 0.72, 1.62, 4.2, 0.04);
  bag.add(M.dark(), new THREE.TorusGeometry(0.22, 0.022, 6, 20), 0.72, 1.62, 4.82, -1.0).box(M.interior(), 2.2, 0.3, 0.4, 0, 1.2, 5.0, 0.05);
  bag.seg = 2;
}
