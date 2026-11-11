// Debug: blocking pass — the whole performance in the real set with a chase camera. Film t → story σ = t * 1.02; frac of query "view" picks the camera.
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import { buildStage } from '../shots/stage';
import { makeBus } from '../world/vehicles';
import { BUS, A, C, D, E, F, Gs } from '../shots/perform';

export async function build(q: URLSearchParams) {
  const S = await buildStage(), view = q.get('view') ?? 'side';
  const bus = makeBus(); bus.group.position.set(BUS.x, 0, BUS.z); bus.group.rotation.y = BUS.yaw; bus.body.rotation.z = BUS.roll; S.scene.add(bus.group);
  const fmt = (o: any) => Object.entries(o).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${k} ${(v as number).toFixed(2)}`).join(' ');
  return {
    scene: S.scene, camera: S.camera, look: defaultLook(), shots: [{ name: 'block', t0: 0, t1: 200 }],
    debug: `A: ${fmt(A)} | C: ${fmt(C)} | D: ${fmt(D)} | E: ${fmt(E)} | F: ${fmt(F)} | G: ${fmt(Gs)}`,
    update(t: number) {
      const pf = S.hero.apply(t), p = pf.root.pos, yaw = pf.root.yaw, cam = S.camera;
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), left = new THREE.Vector3(fwd.z, 0, -fwd.x);
      if (view === 'side') cam.position.copy(p).addScaledVector(left, 4.2).addScaledVector(fwd, 1.2).add(new THREE.Vector3(0, 1.3, 0));
      else if (view === 'north') cam.position.set(p.x + 1.5, p.y + 1.4, p.z - 5.5);
      else if (view === 'east') cam.position.set(p.x + 6, p.y + 1.5, p.z + 2.2);
      else if (view === 'south') cam.position.set(p.x + 2.5, p.y + 1.4, p.z + 5.2);
      else if (view === 'se') cam.position.set(p.x + 5, p.y + 2.2, p.z + 5);
      else if (view === 'front') cam.position.copy(p).addScaledVector(fwd, 3.6).addScaledVector(left, 0.8).add(new THREE.Vector3(0, 1.1, 0));
      else cam.position.set(p.x - 2, p.y + 9, p.z - 9);
      cam.lookAt(p.x, p.y + 0.95, p.z); cam.fov = 38; cam.updateProjectionMatrix();
      S.ground.setTime(t); S.buildings.setTime(t); S.sun.focus(new THREE.Vector3(p.x, p.y, p.z), 26);
    },
  };
}
