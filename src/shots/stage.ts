/** The stage: one scene holding the city, the sun/sky rig and the protagonist. */
import * as THREE from 'three';
import { Sun, makeSky } from '../engine/look';
import { loadAnimationLibraries } from '../char/actor';
import { buildGround } from '../world/ground';
import { buildBuildings } from '../world/buildings';
import { buildHero } from './hero';
import { buildTraffic } from './traffic';
import { buildCrowd } from './crowd';
import { buildNature } from './nature';

export async function buildStage() {
  await loadAnimationLibraries();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.08, 2600);
  const sun = new Sun(scene); scene.add(makeSky());
  scene.fog = new THREE.Fog('#bcd9f2', 90, 900);
  const ground = buildGround(), buildings = buildBuildings(); scene.add(ground.group, buildings.group);
  const hero = await buildHero(); scene.add(hero.root);
  const traffic = buildTraffic(ground), crowd = await buildCrowd(ground), nature = buildNature(); scene.add(traffic.group, crowd.group, nature.group);
  return { scene, camera, sun, ground, buildings, hero, traffic, crowd, nature };
}
export type Stage = Awaited<ReturnType<typeof buildStage>>;
