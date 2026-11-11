/** The protagonist on stage: applies a Perf (pose, face, gaze, props) and runs her secondary motion (cloth lag, hair springs). */
import * as THREE from 'three';
import { toon } from '../engine/look';
import { buildProtagonist, PALETTE, type Protagonist } from '../char/wardrobe';
import { applyPose, blink } from '../char/skater';
import { makeHeadphones, makeCrossbodyBag } from '../world/props';
import { perform } from './perform';

export interface Hero { P: Protagonist; root: THREE.Object3D; /** pose her for story time σ; returns the Perf used */ apply(s: number): ReturnType<typeof perform>; head(out?: THREE.Vector3): THREE.Vector3; chest(out?: THREE.Vector3): THREE.Vector3; bone(n: string, out?: THREE.Vector3): THREE.Vector3 }

export async function buildHero(): Promise<Hero> {
  const P = await buildProtagonist('/assets/cast/protagonist_base.vrm'), a = P.actor;
  a.root.updateMatrixWorld(true);
  const rest = (b: string) => a.raw[b].getWorldPosition(new THREE.Vector3());
  // headphones: one set on her ears, one resting round her neck; only one is visible
  const hpOn = makeHeadphones(PALETTE.cream, PALETTE.orange), hpNeck = makeHeadphones(PALETTE.cream, PALETTE.orange);
  a.attach('head', hpOn, new THREE.Vector3(0, 0.078, 0.004)); hpOn.scale.setScalar(0.93);
  hpNeck.rotation.x = -1.35; hpNeck.scale.set(0.86, 0.8, 0.86); a.attach('neck', hpNeck, new THREE.Vector3(0, 0.035, 0.035));
  // crossbody sling bag on her back, strap from left shoulder to right hip
  const chest = rest('chest'), strapPts = [[0.105, 1.335, 0.0], [0.03, 1.17, 0.168], [-0.15, 0.99, 0.125], [-0.222, 0.94, 0.0], [-0.15, 0.975, -0.135], [-0.01, 1.12, -0.172], [0.085, 1.29, -0.1]].map(([x, y, z]) => new THREE.Vector3(x, y, z).sub(chest));
  const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts, true, 'centripetal'), 80, 0.011, 6, true).scale(1, 1, 1), toon(PALETTE.navy)); strap.castShadow = true;
  const bag = makeCrossbodyBag(PALETTE.orange, PALETTE.cream), bagPivot = new THREE.Group(); bag.rotation.set(0.1, Math.PI + 0.5, -0.5); bag.position.set(0, -0.09, -0.05); bagPivot.add(bag); bagPivot.position.set(-0.1, 1.02, -0.185).sub(chest);
  const pack = new THREE.Group(); pack.add(strap, bagPivot); a.attach('chest', pack);
  pack.traverse((o) => { (o as THREE.Mesh).castShadow = true; });

  const shells = a.root.children.length ? [] as THREE.Object3D[] : []; a.root.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh && (m.geometry.attributes as any).aLoose) shells.push(m); });
  let lastS = NaN; const lag = new THREE.Vector3(), _q = new THREE.Quaternion(), p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  const D = 1 / 30;
  const poseAt = (s: number) => {
    const pf = perform(s);
    applyPose(P, pf.root, pf.pose, pf.dist);
    if (pf.wheelL !== undefined) for (const w of P.skates.left.wheels) w.rotation.x += pf.wheelL / 0.034;
    if (pf.look) a.lookAt(pf.look, pf.lookW ?? 0.7);
    else { const lean = pf.root.spin ? 0 : -(pf.root.roll ?? 0); a.rot('neck', 0, lean * 0.4, 0); a.rot('head', 0, lean * 0.45, -lean * 0.2); a.eyes(THREE.MathUtils.clamp(lean * 0.7, -0.4, 0.4), 0); }   // she looks into her turns
    a.face({ ...pf.face, blink: Math.max(pf.face.blink ?? 0, blink(s) * (pf.face.happy && pf.face.happy > 0.7 ? 0 : 1)) });
    hpOn.visible = pf.hp < 0.5; hpNeck.visible = !hpOn.visible;
    a.commit();
    return pf;
  };
  return {
    P, root: a.root,
    apply(s: number) {
      const dt = s - lastS;
      if (!(dt >= 0 && dt < 0.25)) { a.resetSprings(); for (let k = 24; k >= 1; k--) { poseAt(s - k / 60); a.springs(1 / 60); } }
      const pf = poseAt(s);
      if (dt > 0 && dt < 0.25) a.springs(dt);
      lastS = s;
      // cloth: trail behind velocity, kick against acceleration, flutter with speed
      p0.copy(perform(s - 2 * D).root.pos); p1.copy(perform(s - D).root.pos); p2.copy(pf.root.pos);
      const vel = p2.clone().sub(p1).divideScalar(D), acc = p2.clone().sub(p1).sub(p1.clone().sub(p0)).divideScalar(D * D);
      lag.copy(vel).multiplyScalar(-0.0055).addScaledVector(acc, -0.0012); lag.y = lag.y * 0.6 + Math.min(0.02, vel.length() * 0.002); if (lag.length() > 0.075) lag.setLength(0.075);
      if (shells[0]) { shells[0].getWorldQuaternion(_q).invert(); P.cloth.uLag.value.copy(lag).applyQuaternion(_q); }
      P.cloth.uFlutter.value = Math.min(0.011, 0.0012 + vel.length() * 0.0011); P.cloth.uTime.value = s;
      bagPivot.rotation.x = THREE.MathUtils.clamp(-acc.y * 0.012 + Math.sin(s * 9) * vel.length() * 0.006, -0.35, 0.35);
      return pf;
    },
    head: (out = new THREE.Vector3()) => a.raw.head.getWorldPosition(out).add(new THREE.Vector3(0, 0.09, 0)),
    chest: (out = new THREE.Vector3()) => a.raw.upperChest.getWorldPosition(out),
    bone: (n: string, out = new THREE.Vector3()) => a.raw[n].getWorldPosition(out),
  };
}
