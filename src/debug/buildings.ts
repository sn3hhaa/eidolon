// Debug: buildings/trees/backdrop walk-through. `--query debug=buildings`, floor(t) selects the view.
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import { Sun, makeSky, toon } from '../engine/look';
import { buildBuildings } from '../world/buildings';

// [camera pos, look-at, fov]
const VIEWS: [number[], number[], number][] = [
  [[-60, 1.2, 3.4], [-20, 3.0, 0], 50], [[-60, 0.4, 3.4], [-100, 4, -2], 62],
  [[-30, 1.2, 3.4], [10, 3.0, 0], 50], [[-30, 0.4, 2], [-70, 4, 0], 62],
  [[0, 1.2, 3.4], [40, 3.0, 0], 50], [[0, 0.4, -2], [-40, 4, 2], 62],
  [[30, 1.2, 7.3], [60, 3.5, 4], 50], [[30, 0.4, 0], [-10, 4, 0], 62],
  [[-52, 1.5, -3], [-46, 2.2, -10], 45], [[-66, 1.5, 3.5], [-74, 2.2, 10], 45],
  [[-14, 1.6, 12], [-14, 3.5, 28], 55], [[18, 1.6, 11], [20, 3.5, 26], 55],
  [[48, 1.6, 40], [48, 5, -10], 50], [[20, 1.6, 75], [70, 8, 30], 55],
  [[66, 3, 70], [66, 7, 20], 55], [[-30, 110, 150], [10, 0, 0], 50],
  [[58, 4.3, 30], [60, 4.6, 10], 60], [[66, 4.3, 50], [80, 5, 46], 55], [[35, 1.6, 20], [38, 3, 30], 55], [[100, 1.5, 3], [60, 5, 0], 50],
];
export async function build() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 3000);
  const sun = new Sun(scene); scene.add(makeSky());
  const t0 = performance.now();
  const b = buildBuildings(); scene.add(b.group);
  let hasGround = false;
  try { const m: any = await import(/* @vite-ignore */ '../world/' + 'ground.ts'); const g = await (m.buildGround ?? m.build)(); scene.add(g.group); hasGround = true; } catch { /* fork G not ready */ }
  if (!hasGround) { const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), toon('#b3aca2')); ground.receiveShadow = true; scene.add(ground); }
  let calls = 0; b.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) calls++; });
  return {
    scene, camera, look: defaultLook(), shots: [{ name: 'debug', t0: 0, t1: 90 }],
    debug: `buildings: ${Math.round(b.group.userData.tris)} tris, ${calls} meshes, ${b.solids.length} solids, built in ${(performance.now() - t0).toFixed(0)} ms, ground: ${hasGround}`,
    update(t: number) {
      const [p, l, fov] = VIEWS[Math.min(VIEWS.length - 1, Math.floor(t))];
      camera.position.set(p[0], p[1], p[2]); camera.lookAt(l[0], l[1], l[2]); camera.fov = fov; camera.updateProjectionMatrix();
      b.setTime(t); sun.focus(new THREE.Vector3(p[0] * 0.5 + l[0] * 0.5, 0, p[2] * 0.5 + l[2] * 0.5), p[1] > 50 ? 160 : 60);
    },
  };
}
