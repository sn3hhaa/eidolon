// Debug: vehicles and props. `--query debug=props`, view = Math.floor(t).
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import { Sun, makeSky, toon } from '../engine/look';
import { makeCar, makeBus, makeBicycle, makeScooter, type CarStyle } from '../world/vehicles';
import { propViews } from './propsets';

export type View = { pos: number[]; tgt: number[]; fov?: number; show: THREE.Object3D[]; r?: number };
export async function build() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 2000);
  const sun = new Sun(scene); scene.add(makeSky());
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), toon('#b9b2a6')); ground.receiveShadow = true; scene.add(ground);
  const views: View[] = [], all: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(o: T) => { o.visible = false; scene.add(o); all.push(o); return o; };
  const styles: [CarStyle, string][] = [['sedan', '#3f6fb0'], ['hatch', '#d9483b'], ['wagon', '#6f8f5a'], ['pickup', '#3a7f96'], ['van', '#f1ede2'], ['taxi', '#f2b632'], ['suv', '#7a5a8c'], ['mini', '#e9a23b']];
  // 0..23: each style 3/4 front, 3/4 rear, low wide
  for (const [s, c] of styles) {
    const v = makeCar(s, c, 3 + views.length, { driver: true }); add(v.group); v.steer.forEach((p) => (p.rotation.y = 0.3));
    views.push({ pos: [-3.8, 1.55, 5.4], tgt: [0, 0.75, 0], show: [v.group] }, { pos: [4.0, 1.55, -5.2], tgt: [0, 0.75, 0], show: [v.group] }, { pos: [-1.9, 0.4, 3.6], tgt: [0, 0.75, 0], fov: 55, show: [v.group] });
  }
  // 24: line-up
  const line = add(new THREE.Group()), cols = ['#c94f3d', '#e8e2d2', '#2f4f7a', '#5f9a7a', '#d8b24a', '#8b3f5c', '#4e5560', '#a9c7dd'];
  styles.forEach(([s], i) => { const v = makeCar(s, cols[i], 40 + i); v.group.position.set((i - 3.5) * 2.5, 0, 0); v.group.rotation.y = -0.35; line.add(v.group); });
  views.push({ pos: [-4, 3.2, 13], tgt: [0, 0.6, 0], fov: 42, show: [line], r: 22 });
  // 25..28: bus 3/4 front, from above, low rolled mid-turn, rear 3/4 right (doors)
  const bus = makeBus(); add(bus.group);
  const bus2 = makeBus(); add(bus2.group); bus2.body.rotation.z = THREE.MathUtils.degToRad(12); bus2.steer.forEach((p) => (p.rotation.y = -0.45)); bus2.lights.indicate('r', true); bus2.lights.brake(true);
  views.push({ pos: [-6.5, 2.4, 11.5], tgt: [0, 1.6, 0], fov: 34, show: [bus.group], r: 16 }, { pos: [-5, 12, 8], tgt: [0, 2.5, 0], fov: 40, show: [bus.group], r: 16 },
    { pos: [-3.4, 0.45, 8.6], tgt: [0, 1.7, 1.5], fov: 62, show: [bus2.group], r: 16 }, { pos: [7.5, 2.2, -10.5], tgt: [0, 1.6, 0], fov: 34, show: [bus.group], r: 16 });
  // 29: bikes + scooter
  const tw = add(new THREE.Group()); const b1 = makeBicycle('#d9483b'), b2 = makeBicycle('#3f8fb0'), sc = makeScooter('#7fc7b5'), sc2 = makeScooter('#e8c34a');
  b1.position.x = -1.6; b2.position.x = -0.6; b2.rotation.y = 0.5; sc.position.x = 0.7; sc2.position.x = 1.9; sc2.rotation.y = -0.6; tw.add(b1, b2, sc, sc2);
  views.push({ pos: [-2.8, 1.3, 3.6], tgt: [0.1, 0.55, 0], fov: 36, show: [tw], r: 6 });
  propViews(add, views);
  const count = (o: THREE.Object3D) => { let tri = 0, dc = 0; o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { const g = m.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; dc += Array.isArray(m.material) ? m.material.length : 1; } }); return Math.round(tri) + " tris/" + dc + " dc"; };
  const stats = styles.map(([s]) => s + " " + count(makeCar(s, "#888888").group)).join(" | ") + " | bus " + count(bus.group) + " | bike " + count(b1) + " | scooter " + count(sc);
  return {
    scene, camera, look: defaultLook(), shots: [{ name: 'debug', t0: 0, t1: 900 }], debug: `views ${views.length}
${stats}`,
    update(t: number) {
      const v = views[Math.min(views.length - 1, Math.floor(t))];
      for (const o of all) o.visible = v.show.includes(o);
      camera.position.set(v.pos[0], v.pos[1], v.pos[2]); camera.lookAt(v.tgt[0], v.tgt[1], v.tgt[2]); camera.fov = v.fov ?? 30; camera.updateProjectionMatrix();
      sun.focus(new THREE.Vector3(v.tgt[0], 1, v.tgt[2]), v.r ?? 12);
    },
  };
}
