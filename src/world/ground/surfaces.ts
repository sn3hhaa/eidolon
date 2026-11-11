/** Roads, kerbs, sidewalks, markings, base ground. */
import * as THREE from 'three';
import { toon } from '../../engine/look';
import { CURB, L } from '../layout';
import { type Ctx, M } from './kit';
import { asphalt, pavers } from './textures';

/** Decal material: toon, pulled toward the camera so it never z-fights the surface below. */
const decals = new Map<string, THREE.Material>();
export function decal(color: string, map?: THREE.Texture, alpha = false) {
  const k = color + (map?.uuid ?? '') + alpha;
  let m = decals.get(k);
  if (!m) { m = toon(map ? '#ffffff' : color, alpha ? { map: map ?? null, transparent: true, depthWrite: false } : { map: map ?? null }); m.polygonOffset = true; m.polygonOffsetFactor = -3; m.polygonOffsetUnits = -3; decals.set(k, m); }
  return m;
}

export function buildSurfaces(c: Ctx) {
  const { b } = c, mn = L.main, hb = L.harbor;
  const HX0 = hb.x - hb.halfRoad, HX1 = hb.x + hb.halfRoad, SX0 = HX0 - hb.sidewalk, SX1 = HX1 + hb.sidewalk;   // 43.5, 52.5, 40, 56
  const road = M('#ffffff', asphalt(), 'road'); b.ground(road);
  b.flatQuad(road, mn.x0, -mn.halfRoad, mn.x1, mn.halfRoad, 0, 8);
  b.flatQuad(road, HX0, hb.z0, HX1, -mn.halfRoad, 0, 8);
  b.flatQuad(road, HX0, mn.halfRoad, HX1, hb.z1, 0, 8);

  // base ground under everything (lots are fork B's; this only guarantees no holes)
  const base = M('#b8ad9c'); b.ground(base);
  b.flatQuad(base, -260, -260, 300, 61.9, -0.03);

  // sidewalks: paved slabs CURB high with a granite kerb strip on the road side
  const walk = M('#ffffff', pavers('#d8cdbb', '#a89c8c', 4, 4, 11, 0.045), 'walk'), kerb = M('#c9c4bd'); b.ground(walk); b.ground(kerb);
  const K = 0.28, F = 9.5;
  const slab = (x0: number, z0: number, x1: number, z1: number) => { b.flatQuad(walk, x0, z0, x1, z1, CURB, 2); };
  const kerbX = (x0: number, x1: number, z: number, side: number) => b.box(kerb, x1 - x0, CURB + 0.012, K, (x0 + x1) / 2, 0, z + side * K / 2);   // kerb running along x; side = +1 → strip lies at z..z+K
  const kerbZ = (z0: number, z1: number, x: number, side: number) => b.box(kerb, K, CURB + 0.012, z1 - z0, x + side * K / 2, 0, (z0 + z1) / 2);
  for (const s of [-1, 1]) {
    // Main St sidewalks (split by Harbor Ave)
    for (const [x0, x1] of [[mn.x0, HX0], [HX1, mn.x1]]) { slab(x0, s * mn.halfRoad, x1, s * F); kerbX(x0, x1, s * mn.halfRoad, s); }
    kerbZ(Math.min(s * mn.halfRoad, s * F), Math.max(s * mn.halfRoad, s * F), HX0, -1); kerbZ(Math.min(s * mn.halfRoad, s * F), Math.max(s * mn.halfRoad, s * F), HX1, 1);   // corner returns
    // Harbor Ave sidewalks north and south of Main
    for (const [z0, z1] of s < 0 ? [[hb.z0, -F]] : [[F, hb.z1]]) {
      slab(SX0, z0, HX0, z1); slab(HX1, z0, SX1, z1);
      kerbZ(z0, z1, HX0, -1); kerbZ(z0, z1, HX1, 1);
    }
  }
  // corner radii: small quarter-round kerb fillers at the four corners
  for (const [x, z] of [[HX0, -mn.halfRoad], [HX1, -mn.halfRoad], [HX0, mn.halfRoad], [HX1, mn.halfRoad]]) b.cyl(kerb, 0.32, 0.32, CURB + 0.006, x, 0, z, 14);

  // --- markings ---
  const white = decal('#f1ece0'), yellow = decal('#eda32c');
  const Y = 0.012;
  const stripe = (m: THREE.Material, x0: number, z0: number, x1: number, z1: number) => b.flatQuad(m, x0, z0, x1, z1, Y, 1);
  b.ground(white); b.ground(yellow);
  // Main St double yellow centre line, broken at crossings and the intersection
  for (const [x0, x1] of [[mn.x0, -4.6], [0.6, SX0 - 1.2], [SX1 + 1.2, mn.x1]]) { stripe(yellow, x0, -0.22, x1, -0.1); stripe(yellow, x0, 0.1, x1, 0.22); }
  // parking-lane edge: dashed white line + bay ticks
  for (const s of [-1, 1]) for (let x = mn.x0 + 2; x < mn.x1 - 2; x += 6) {
    if (x > SX0 - 8 && x < SX1 + 8) continue; if (x > -6 && x < 2) continue;
    stripe(white, x, s * 3.0 - 0.05, x + 0.12, s * 4.95);
    stripe(white, x, s * 3.0 - 0.06, x + 1.4, s * 3.0 + 0.06);
  }
  // Harbor Ave dashed centre line
  for (let z = hb.z0 + 1; z < hb.z1 - 3; z += 5) { if (z > -14 && z < 12) continue; stripe(white, hb.x - 0.07, z, hb.x + 0.07, z + 2.4); }
  // zebra crossings: [x0,z0,x1,z1, stripes run along x?]
  const zebra = (x0: number, z0: number, x1: number, z1: number, alongX: boolean) => {
    if (alongX) for (let z = z0 + 0.25; z < z1 - 0.3; z += 0.95) stripe(white, x0, z, x1, z + 0.5);
    else for (let x = x0 + 0.25; x < x1 - 0.3; x += 0.95) stripe(white, x, z0, x + 0.5, z1);
  };
  zebra(SX0 + 0.3, -mn.halfRoad, HX0 - 0.3, mn.halfRoad, true); zebra(HX1 + 0.3, -mn.halfRoad, SX1 - 0.3, mn.halfRoad, true);
  zebra(HX0, mn.halfRoad + 0.5, HX1, F - 0.6, false); zebra(HX0, -F + 0.6, HX1, -mn.halfRoad - 0.5, false);
  zebra(-3.6, -mn.halfRoad, -0.4, mn.halfRoad, true);
  // stop lines
  stripe(white, SX0 - 1.0, 0.3, SX0 - 0.6, mn.halfRoad); stripe(white, SX1 + 0.6, -mn.halfRoad, SX1 + 1.0, -0.3);
  stripe(white, HX0, -F - 0.9, hb.x - 0.2, -F - 0.5); stripe(white, hb.x + 0.2, F + 0.5, HX1, F + 0.9);
  stripe(white, -5.4, 0.3, -5.0, mn.halfRoad); stripe(white, 1.0, -mn.halfRoad, 1.4, -0.3);
  // manholes / drain grates / tar patches
  const iron = decal('#4d4a55'), patch = decal('#6f6b77'); b.ground(iron); b.ground(patch);
  for (const [x, z] of [[-88, 1.6], [-47, -1.8], [-18, 1.5], [12, -1.4], [33, 1.7], [70, -1.6], [94, 1.5]]) { b.add(iron, new THREE.CircleGeometry(0.38, 20), x, 0.012, z, 0, -Math.PI / 2); b.add(patch, new THREE.RingGeometry(0.38, 0.5, 20), x, 0.011, z, 0, -Math.PI / 2); }
  for (const [x, z, w, d] of [[-70, -2.2, 3.4, 1.6], [-25, 2.0, 2.2, 2.6], [22, -2.6, 4.2, 1.2], [80, 2.2, 2.8, 1.8], [49.5, 30, 1.8, 3.6], [47, -40, 2.2, 3]]) stripe(patch, x, z, x + w, z + d);
  for (let x = mn.x0 + 9; x < mn.x1; x += 24) for (const s of [-1, 1]) { if (x > SX0 - 3 && x < SX1 + 3) continue; stripe(iron, x, s * 4.68 - 0.16, x + 0.6, s * 4.68 + 0.16); }
}
