// Debug: the static ground set (plus fork B's buildings if present). `--query debug=ground`, floor(t) picks the view.
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import { Sun, makeSky } from '../engine/look';
import { buildGround } from '../world/ground';

// [camera position, look-at target, fov]
const VIEWS: [number[], number[], number][] = [
  [[-60, 1.2, 3.4], [-30, 1.4, 2.5], 50],      // 0 Main St east from x=-60
  [[-30, 1.0, 3.6], [-60, 2.0, 0], 50],        // 1 Main St west from x=-30
  [[-36, 0.6, 3.6], [-28, 0.8, 3.4], 55],      // 2 barrier low
  [[-10, 1.3, 2.5], [10, 1.5, 3], 50],         // 3 Main St east from x=-10
  [[10, 1.2, 3], [-12, 1.6, 6], 50],           // 4 west from x=10
  [[-14, 1.6, 6.5], [-14, 2.2, 24], 55],       // 5 court
  [[8, 1.5, 8], [18, 0.6, 14], 55],            // 6 splash plaza
  [[16, 1.2, 7.0], [40, 1.6, 7.6], 45],        // 7 ledge + bank + intersection from the west
  [[41, 1.6, -3], [56, 2.6, 12], 55],          // 8 intersection looking SE to the High Walk
  [[58, 4.3, 8], [58.6, 3.6, 40], 55],         // 9 High Walk deck looking south
  [[64, 4.4, 44], [66, 2.2, 66], 55],          // 10 terrace → stairs + sea
  [[66, 1.4, 78], [66, 2.6, 58], 55],          // 11 promenade looking north up the stairs
  [[20, 1.5, 80], [70, 3.0, 62], 50],          // 12 promenade wide NE
  [[30, 1.6, 74], [-30, 1.2, 80], 50],         // 13 promenade west + sea
  [[60, 2.0, 66], [90, 0.5, 110], 50],         // 14 sea, pier, far shore
  [[10, 70, 95], [30, 0, 15], 50],             // 15 aerial overview
  [[52, 1.0, 22], [57, 2.2, 10], 60],          // 16 arcade under the High Walk from Harbor Ave
  [[38, 1.4, 12], [50, 1.2, 4], 60],           // 17 bank ramp close
  [[-47, 1.5, 3.2], [-51.5, 1.4, 6.8], 55],    // 18 bus shelter
  [[14, 1.5, 19.5], [17.4, 1.4, 24.4], 50],    // 19 kiosk + café
  [[33.5, 1.2, 8.6], [35.5, 0.7, 11.4], 55],   // 20 bike rack
  [[-11, 1.5, -5.5], [-9.5, 0.8, -9.3], 55],   // 21 fruit stall + café
  [[45.5, 1.6, 2.5], [53.2, 4.6, 5.6], 50],    // 22 signal head close
  [[-14, 1.7, 21], [-14, 3.1, 25.6], 45],      // 23 hoop close
  [[22, 1.2, 6.0], [27, 0.5, 7.6], 55],        // 24 ledge close
  [[62, 1.5, 70], [20, 1.5, 96], 50],          // 25 pier + boats
];
export async function build() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 2500);
  const sun = new Sun(scene); scene.add(makeSky());
  const ground = buildGround(); scene.add(ground.group);
  let extra = '';
  try { const mod: any = await import(/* @vite-ignore */ '../world/' + 'buildings'); const b = await (mod.buildBuildings ?? mod.build)(); scene.add(b.group ?? b); extra = ' +buildings'; } catch { extra = ' (no buildings module yet)'; }
  return {
    scene, camera, look: defaultLook(), shots: [{ name: 'debug', t0: 0, t1: 90 }],
    debug: `ground: ${ground.stats.triangles} tris, ${ground.stats.drawCalls} draw calls, anchors ${Object.entries(ground.anchors).map(([k, v]) => `${k}:${v.length}`).join(' ')}${extra}`,
    update(t: number) {
      const [p, q, fov] = VIEWS[Math.min(VIEWS.length - 1, Math.floor(t))];
      camera.position.set(p[0], p[1], p[2]); camera.lookAt(q[0], q[1], q[2]); camera.fov = fov; camera.updateProjectionMatrix();
      ground.setTime(12.5 + (t % 1) * 4); ground.setSignals('g', 'r');
      sun.focus(new THREE.Vector3(q[0], 0, q[2]).lerp(camera.position, 0.5), Math.floor(t) === 15 ? 110 : 45);
    },
  };
}
