/** Street lighting, tree-pit grates, utility poles + wires, and the intersection's traffic signals. */
import * as THREE from 'three';
import { toon } from '../../engine/look';
import { CURB, L } from '../layout';
import { type Ctx, M, anchor } from './kit';
import { lampPost } from './props';
import { decal } from './surfaces';
import { painted } from './textures';

type Sig = 'g' | 'y' | 'r' | 'off';
const LIT: Record<string, string> = { r: '#ff4a32', y: '#ffc02e', g: '#3dfc9a' }, DARK: Record<string, string> = { r: '#4a1c18', y: '#4a3a14', g: '#123f2c' };

export function buildFurniture(c: Ctx): (main: Sig, harbor: Sig) => void {
  const { b } = c, Y = CURB, mn = L.main, hb = L.harbor;
  // ---- Main St lamp posts at x ≡ 6 (mod 12), z = ±5.7 (arm over the road) ----
  for (let x = -114; x <= 102; x += 12) {
    if (x > 39 && x < 57) continue;
    lampPost(c, x, Y, -5.7, 0); if (x !== 30) lampPost(c, x, Y, 5.7, Math.PI);
  }
  for (let z = -66; z <= 54; z += 12) { if (Math.abs(z) < 12) continue; if (z < 0 || z > 43) lampPost(c, hb.x + hb.halfRoad + 0.7, Y, z + 6, -Math.PI / 2, 5.6); lampPost(c, hb.x - hb.halfRoad - 0.7, Y, z + 6, Math.PI / 2, 5.6); }
  // ---- tree-pit grates (the trees themselves are fork B's) ----
  const grate = decal('#6b6259'), soil = decal('#4f3d30'); b.ground(grate); b.ground(soil);
  const pit = (x: number, z: number) => { b.flatQuad(grate, x - 0.65, z - 0.65, x + 0.65, z + 0.65, Y + 0.006, 1); b.add(soil, new THREE.CircleGeometry(0.34, 14), x, Y + 0.012, z, 0, -Math.PI / 2); (c.anchors.treePits ??= []).push({ x, y: Y, z }); };
  for (let x = -120; x <= 108; x += 12) { if (x > 40 && x < 56) continue; pit(x, -6.0); if (!(x >= 18 && x <= 44)) pit(x, 6.0); }
  for (let z = -66; z <= 54; z += 12) { if (Math.abs(z) < 10) continue; pit(41.2, z); if (z < 0) pit(54.8, z); }
  // ---- utility poles with sagging wires along Main St's north kerb ----
  const wood = M('#7a5f48'), dark = M('#39404a'), wire = M('#2f333c'), PH = 8.6, pz = -5.45;
  const xs: number[] = []; for (let x = -117; x <= 108; x += 24) xs.push(x > 30 && x < 45 ? 38.6 : x > 45 && x < 60 ? 57.4 : x);
  xs.forEach((x, i) => {
    b.cyl(wood, 0.13, 0.09, PH, x, Y, pz, 8);
    for (const [h, w] of [[PH - 0.5, 2.0], [PH - 1.3, 1.5]]) { b.box(wood, 0.09, 0.09, w, x, Y + h, pz); for (const s of [-0.45, 0, 0.45]) b.cyl(dark, 0.035, 0.035, 0.12, x, Y + h + 0.09, pz + s * w, 6); }
    if (i % 3 === 1) { b.cyl(M('#8f979e'), 0.24, 0.24, 0.7, x + 0.32, Y + PH - 2.6, pz, 10); b.box(dark, 0.3, 0.06, 0.06, x + 0.16, Y + PH - 2.2, pz); }
    c.solids.push([x - 0.15, pz - 0.15, x + 0.15, pz + 0.15, PH]);
    if (i === 0) return;
    const x0 = xs[i - 1], span = x - x0, N = 10;
    for (const [h, w, sag] of [[PH - 0.35, 0.9, 0.55], [PH - 0.35, 0, 0.62], [PH - 0.35, -0.9, 0.5], [PH - 1.15, 0.68, 0.75], [PH - 1.15, -0.68, 0.7]]) for (let k = 0; k < N; k++) {
      const u0 = k / N, u1 = (k + 1) / N, y0 = Y + h - sag * 4 * u0 * (1 - u0), y1 = Y + h - sag * 4 * u1 * (1 - u1), len = Math.hypot(span / N, y1 - y0);
      b.add(wire, new THREE.BoxGeometry(len, 0.022, 0.022), x0 + span * (u0 + u1) / 2, (y0 + y1) / 2, pz + w, 0, 0, Math.atan2(y1 - y0, span / N));
    }
  });
  // ---- traffic signals: far-side mast arms. SE + NW poles serve Main St, NE + SW poles serve Harbor Ave ----
  const pole = M('#4a5560'), yel = M('#e0a528'), HX0 = hb.x - hb.halfRoad, HX1 = hb.x + hb.halfRoad;
  const lampM: Record<string, Record<string, THREE.MeshToonMaterial>> = { main: {}, harbor: {} };
  for (const grp of ['main', 'harbor']) for (const k of ['r', 'y', 'g']) lampM[grp][k] = toon(DARK[k]);
  const street = (name: string, col: string) => painted('st' + name, 256, 48, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe2'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#f4efe2'; g.font = 'bold 26px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 + 1); });
  /** head: 3-lamp box whose lamps face direction (fx,fz) */
  const head = (grp: string, x: number, y: number, z: number, fx: number, fz: number) => {
    const ry = Math.atan2(fx, fz);
    b.box(yel, 0.36, 1.05, 0.26, x, y, z, ry); b.box(dark, 0.44, 1.13, 0.04, x - fx * 0.13, y - 0.04, z - fz * 0.13, ry);
    ['r', 'y', 'g'].forEach((k, i) => {
      b.add(lampM[grp][k], new THREE.CircleGeometry(0.115, 14), x + fx * 0.135, y + 0.86 - i * 0.33, z + fz * 0.135, ry);
      b.add(yel, new THREE.CylinderGeometry(0.14, 0.14, 0.16, 10, 1, true, -Math.PI / 2, Math.PI), x + fx * 0.2, y + 0.9 - i * 0.33, z + fz * 0.2, ry, Math.PI / 2);
    });
  };
  /** pole at a corner with a mast arm reaching (ax,az) metres over the carriageway; heads face (fx,fz) */
  const signal = (grp: string, x: number, z: number, ax: number, az: number, fx: number, fz: number, name: string) => {
    const H = 6.0, len = Math.hypot(ax, az), ry = Math.atan2(-az, ax);
    b.cyl(pole, 0.16, 0.12, 1.0, x, Y, z, 10); b.cyl(pole, 0.1, 0.07, H - 1, x, Y + 1, z, 10);
    b.add(pole, new THREE.BoxGeometry(len, 0.09, 0.09), x + ax / 2, Y + H - 0.25, z + az / 2, ry);
    head(grp, x + ax * 0.96, Y + H - 1.2, z + az * 0.96, fx, fz); head(grp, x + ax * 0.5, Y + H - 1.2, z + az * 0.5, fx, fz); head(grp, x + fx * 0.25, Y + 2.6, z + fz * 0.25, fx, fz);
    b.box(dark, 0.3, 0.34, 0.2, x - fx * 0.2, Y + 2.2, z - fz * 0.2, Math.atan2(-fx, -fz));           // pedestrian signal box
    b.add(M('#ffffff', street(name, name.startsWith('MAIN') ? '#1f6a4a' : '#27508f'), 's' + name), new THREE.PlaneGeometry(1.5, 0.28), x + ax * 0.25 + fx * 0.06, Y + H - 0.55, z + az * 0.25 + fz * 0.06, Math.atan2(fx, fz));
    anchor(c, 'signals', x, Y, z); c.solids.push([x - 0.2, z - 0.2, x + 0.2, z + 0.2, H]);
  };
  signal('main', HX1 + 0.55, mn.halfRoad + 0.5, 0, -5.2, -1, 0, 'MAIN ST');          // SE corner → eastbound traffic
  signal('main', HX0 - 0.55, -mn.halfRoad - 0.5, 0, 5.2, 1, 0, 'MAIN ST');           // NW corner → westbound
  signal('harbor', HX1 + 0.55, -mn.halfRoad - 0.5, -4.7, 0, 0, 1, 'HARBOR AVE');     // NE corner → northbound
  signal('harbor', HX0 - 0.55, mn.halfRoad + 0.5, 4.7, 0, 0, -1, 'HARBOR AVE');      // SW corner → southbound
  const set = (grp: string, s: Sig) => { for (const k of ['r', 'y', 'g']) { const m = lampM[grp][k], on = s === k; m.color.set(on ? LIT[k] : DARK[k]); m.emissive.set(on ? LIT[k] : '#000000'); m.emissiveIntensity = on ? 1.6 : 0; } };
  set('main', 'g'); set('harbor', 'r');
  return (main, harbor) => { set('main', main); set('harbor', harbor); };
}
