// Small-prop debug views: bird flap sequences, table of props with a 1 m reference cube.
import * as THREE from 'three';
import { toon } from '../engine/look';
import * as P from '../world/props';
import type { View } from './props';

export function propViews(add: <T extends THREE.Object3D>(o: T) => T, views: View[]) {
  for (const kind of ['pigeon', 'gull'] as const) {                      // 6 flap poses + glide, two rows (front-ish and side)
    const g = add(new THREE.Group()), sp = kind === 'gull' ? 1.5 : 0.8;
    for (let i = 0; i < 7; i++) for (const row of [0, 1]) {
      const b = P.makeBird(kind, 1 + i); b.pose(i / 6 - 0.2 * 0, i === 6 ? 1 : 0); if (i === 6) b.pose(0, 1); else b.pose(i / 6, 0);
      b.group.position.set((i - 3) * sp, 1.2 + row * sp * 0.75, 0); b.group.rotation.y = row ? -Math.PI / 2 : 0.5; g.add(b.group);
    }
    views.push({ pos: [0, 1.2 + sp * 0.45, sp * 6.2], tgt: [0, 1.2 + sp * 0.4, 0], fov: 32, show: [g], r: 8 });
  }
  const t = add(new THREE.Group()), H = 0.8;
  const table = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 1.3), toon('#e9e2d2')); table.position.y = H - 0.02; table.receiveShadow = true; t.add(table);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon('#9aa6b8')); cube.position.set(-2.4, 0.5, 0); cube.castShadow = true; t.add(cube);
  const put = (o: THREE.Object3D, x: number, z: number, y = 0) => { o.position.set(x, H + y, z); t.add(o); return o; };
  put(P.makeBasketball(), -1.45, 0.1, 0.12); put(P.makeCrate(), -0.95, -0.25);
  for (let i = 0; i < 5; i++) put(P.makeOrange(), -1.1 + i * 0.09, 0.3 + (i % 2) * 0.07, 0.04);
  const cup = put(P.makePaperCup(), -0.45, 0.25); const sp = P.makeCupSplash(); sp.position.set(0.02, 0.13, 0); cup.add(sp);
  put(P.makeNewspaperSheet(1), -0.05, -0.2, 0.35).rotation.x = -0.9; put(P.makeNewspaperSheet(2), 0.4, -0.3, 0.3).rotation.set(-1.2, 0.4, 0.3);
  for (let i = 0; i < 8; i++) { const l = put(P.makeLeaf(i), 0.1 + i * 0.09, 0.35, 0.02 + (i % 3) * 0.03); l.rotation.set(-1.2 + i * 0.3, i, 0); }
  put(P.makeFrisbee('#ef5a3c'), 0.85, 0.25, 0.02); put(P.makeIceCream(), 1.1, 0.3).rotation.z = 0.3;
  put(P.makeHeadphones('#f3ecd8', '#ef7b2b'), 1.45, 0.15, 0.14); put(P.makeCrossbodyBag('#ef7b2b', '#f3ecd8'), 0.95, -0.25, 0.09).rotation.y = 0.3;
  const kite = put(P.makeKite(), 1.55, -0.45, 1.25); kite.rotation.y = 0.3; kite.scale.setScalar(0.8);
  views.push({ pos: [0.2, 1.9, 3.3], tgt: [-0.1, 0.95, 0], fov: 40, show: [t], r: 6 }, { pos: [1.25, 1.2, 0.95], tgt: [1.2, 0.92, 0], fov: 36, show: [t], r: 4 }, { pos: [-0.9, 1.25, 1.05], tgt: [-0.85, 0.9, 0], fov: 36, show: [t], r: 4 });
}
