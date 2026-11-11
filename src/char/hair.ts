/** Hairstyle transplant: fit another CC0 avatar's hair onto the protagonist's head as a rigid, stable piece (no spring simulation). */
import * as THREE from 'three';
import { Actor } from './actor';

const faceBox = (a: Actor) => { const g = a.part('Face_00_SKIN')[0].geometry; g.computeBoundingBox(); return g.boundingBox!.clone(); };

export async function transplantHair(actor: Actor, donorFile: string, tint: string) {
  const donor = await Actor.load(donorFile), bP = faceBox(actor), bD = faceBox(donor);
  const s = (bP.max.x - bP.min.x) / (bD.max.x - bD.min.x), cP = bP.getCenter(new THREE.Vector3()), cD = bD.getCenter(new THREE.Vector3());
  cP.y = bP.max.y; cD.y = bD.max.y;                                   // align the crowns
  const head = actor.raw.head, scene = actor.vrm.scene; actor.root.updateMatrixWorld(true);
  const headP = scene.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
  for (const m of actor.part('Hair_00_HAIR')) m.visible = false;
  const col = new THREE.Color(tint);
  for (const src of donor.part('Hair_00_HAIR')) {
    const g = src.geometry.clone(), p = g.attributes.position.clone(); g.setAttribute('position', p); g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight');
    for (let i = 0; i < p.count; i++) p.setXYZ(i, (p.getX(i) - cD.x) * s + cP.x - headP.x, (p.getY(i) - cD.y) * s + cP.y - headP.y, (p.getZ(i) - cD.z) * s + cP.z - headP.z);
    const mats = (Array.isArray(src.material) ? src.material : [src.material]).map((x) => x.clone()); (mats[0] as any).color?.copy(col); (mats[0] as any).shadeColorFactor?.multiply(col);
    const mesh = new THREE.Mesh(g, Array.isArray(src.material) ? mats : mats[0]); mesh.castShadow = true; mesh.frustumCulled = false; head.add(mesh);
  }
}
