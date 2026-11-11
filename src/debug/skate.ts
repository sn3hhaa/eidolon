// Debug: the skating pose vocabulary. t = pose index (fraction selects camera: .0 3/4 front, .5 side).
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import { Sun, makeSky, toon } from '../engine/look';
import { loadAnimationLibraries } from '../char/actor';
import { buildProtagonist } from '../char/wardrobe';
import { POSE, applyPose, type SkPose } from '../char/skater';

export async function build() {
  await loadAnimationLibraries();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 2000);
  const sun = new Sun(scene); scene.add(makeSky());
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), toon('#b9b2a6')); ground.receiveShadow = true; scene.add(ground);
  const P = await buildProtagonist('/assets/cast/protagonist_base.vrm'); scene.add(P.actor.root);
  const list: [SkPose, number][] = [[POSE.stand(), 0], [POSE.glide(0.2), 0], [POSE.glide(0.8, -1), 0], ...[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((p) => [POSE.stride(p, 0.8), 0] as [SkPose, number]), [POSE.tuck(), 0], [POSE.launch(), 0.3], [POSE.air(), 0.7], [POSE.grab(), 0.8], [POSE.reach(), 0.3], [POSE.land(), 0], [POSE.grind(), 0], [POSE.brake(), 0]];
  return {
    scene, camera, look: defaultLook(), shots: [{ name: 'debug', t0: 0, t1: 90 }], debug: `poses ${list.length}`,
    update(t: number) {
      const i = Math.min(list.length - 1, Math.floor(t)), side = t - i >= 0.45;
      applyPose(P, { pos: new THREE.Vector3(0, list[i][1], 0), yaw: 0 }, list[i][0], t);
      P.actor.face({}); P.actor.commit();
      if (side) camera.position.set(4.2, 1.0, 0.3); else camera.position.set(2.3, 1.2, 3.4);
      camera.lookAt(0, 0.85 + list[i][1], 0); camera.fov = 28; camera.updateProjectionMatrix(); sun.focus(new THREE.Vector3(0, 1, 0), 6);
    },
  };
}
