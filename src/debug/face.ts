// Debug: expression calibration for the protagonist. t = index into LIST.
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import { Sun, makeSky } from '../engine/look';
import { loadAnimationLibraries, type Face } from '../char/actor';
import { buildHero } from '../shots/hero';
import { POSE, applyPose } from '../char/skater';

const LIST: Face[] = [{}, { happy: 0.25 }, { happy: 0.5 }, { happy: 1 }, { relaxed: 0.5 }, { relaxed: 1 }, { surprised: 0.5 }, { surprised: 1 }, { sad: 0.5 }, { aa: 0.4 }, { ee: 0.5 }, { oh: 0.6 }, { ih: 0.5 }, { happy: 0.25, aa: 0.25 }, { relaxed: 0.4, ee: 0.3 }, { surprised: 0.4, oh: 0.4 }, { happy: 0.3, ee: 0.35 }, { relaxed: 0.3, happy: 0.2 }, { surprised: 0.25, ee: 0.3 }, { sad: 0.3, oh: 0.2 }];
export async function build() {
  await loadAnimationLibraries();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 16 / 9, 0.05, 2000);
  const sun = new Sun(scene); scene.add(makeSky());
  const H = await buildHero(); scene.add(H.root);
  return { scene, camera, look: defaultLook(), shots: [{ name: 'debug', t0: 0, t1: 90 }], debug: '',
    update(t: number) {
      applyPose(H.P, { pos: new THREE.Vector3(), yaw: Math.PI / 2 }, POSE.stand());
      H.P.actor.eyes(0, 0); H.P.actor.face(LIST[Math.min(LIST.length - 1, Math.floor(t))]); H.P.actor.commit();
      const h = H.head(); camera.position.set(h.x + 0.95, h.y, h.z - 0.3); camera.lookAt(h.x, h.y - 0.02, h.z); camera.updateProjectionMatrix(); sun.focus(h, 5);
    } };
}
