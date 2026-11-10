import * as THREE from 'three';
import { CameraRig } from '../../engine/CameraRig';
import { Rng } from '../../engine/rng';
import { Track } from '../../engine/Track';
import { DEFAULT_LOOK, type FilmContext, type FilmScene, type SceneLook } from '../../engine/types';
import { createGlow, createStreaks } from './burst';
import { createEmbers, createSparkles } from './particles';
import { createShards } from './shards';
import { createUniforms } from './uniforms';

/**
 * Scene 01 — THE AWAKENING (00:00–00:10)
 *
 *   0.0 – 0.6   darkness
 *   0.6 – 4.5   a seed star appears; its light creeps outward and finds the
 *               rims of painted fragments hanging in the black
 *   4.5 – 5.0   the light draws breath (dims, contracts)
 *   5.0 – 6.9   it bursts: needle rays, shock ring, embers; fragments recoil
 *   6.9 – 10.0  the camera dives at the core (fastest near 8.6 s) and settles
 *               as it swells and resolves into a moon among the fragments
 *               (→ Scene 02)
 */
const IGNITE = 4.95;

export class AwakeningScene implements FilmScene {
  readonly built = true;

  private readonly scene = new THREE.Scene();
  private readonly u = createUniforms();
  private readonly origin = new THREE.Vector3();

  private readonly rig = new CameraRig({
    position: [
      new THREE.Vector3(2.4, 1.1, 47),
      new THREE.Vector3(-1.6, 0.5, 39),
      new THREE.Vector3(0.9, -0.4, 31),
      new THREE.Vector3(0.25, -0.1, 15),
      new THREE.Vector3(0, 0, 2.6),
    ],
    target: [new THREE.Vector3(0, 0, 0)],
    // the dive: accelerate from 6.9 s, peak near 8.6 s, then settle on the moon.
    // 0.702 is chosen so the velocity is continuous across the 8.6 s key.
    travel: new Track(
      [0, 0],
      [4.9, 0.2, 'sine.inOut'],
      [6.9, 0.34, 'sine.inOut'],
      [8.6, 0.702, 'power2.in'],
      [10, 1, 'power2.out'],
    ),
    fov: new Track([0, 36], [5.0, 38, 'sine.inOut'], [6.9, 40, 'sine.inOut'], [10, 62, 'sine.inOut']),
    roll: new Track([0, 2.5], [5, -2.0, 'sine.inOut'], [6.9, 1.0, 'sine.inOut'], [10, 9, 'sine.inOut']),
    drift: { amplitude: 0.1, speed: 0.6, phase: 1.3 },
  });

  private readonly light = new Track(
    [0, 0],
    [0.6, 0],
    [1.7, 0.07, 'sine.out'],
    [4.5, 0.36, 'sine.inOut'],
    [IGNITE, 0.2, 'sine.inOut'],
    [5.3, 1.3, 'expo.out'],
    [6.6, 1.0, 'sine.inOut'],
    [8.4, 1.15, 'sine.inOut'],
    [10, 1.7, 'power2.in'],
  );
  private readonly burst = new Track([IGNITE, 0], [6.7, 1, 'expo.out'], [10, 1.12]);
  private readonly push = new Track([IGNITE, 0], [6.9, 1, 'expo.out'], [10, 1.3]);
  private readonly shock = new Track([IGNITE, 0], [7.2, 1, 'power2.out']);
  private readonly warp = new Track([6.9, 0], [8.8, 1, 'power2.in']);
  private readonly core = new Track(
    [0.6, 0],
    [1.7, 0.045, 'sine.out'],
    [4.5, 0.12, 'sine.inOut'],
    [IGNITE, 0.06, 'sine.inOut'],
    [5.35, 0.21, 'back.out(2.2)'],
    [7.2, 0.24, 'sine.inOut'],
    [10, 1.0, 'sine.inOut'],
  );
  private readonly moon = new Track([8.25, 0], [9.4, 1, 'sine.inOut']);
  private readonly reveal = new Track([0.6, 0], [1.7, 9, 'sine.out'], [4.5, 40, 'sine.inOut'], [5.6, 95, 'expo.out']);

  init(): void {
    const rng = new Rng(0xe1d0104);
    this.scene.add(createShards(rng, this.u));
    this.scene.add(createGlow(this.u));
    this.scene.add(createStreaks(rng, this.u));
    this.scene.add(createSparkles(rng, this.u));
    this.scene.add(createEmbers(rng, this.u));
  }

  render(t: number, target: THREE.WebGLRenderTarget, ctx: FilmContext): void {
    const { u, rig } = this;
    rig.apply(t);
    const cam = rig.camera;

    u.uTime.value = t;
    u.uLight.value = this.light.at(t);
    u.uBurst.value = this.burst.at(t);
    u.uBurstAge.value = t - IGNITE;
    u.uPush.value = this.push.at(t);
    u.uShock.value = this.shock.at(t);
    u.uWarp.value = this.warp.at(t);
    u.uCore.value = this.core.at(t);
    u.uMoon.value = this.moon.at(t);
    u.uReveal.value = this.reveal.at(t);
    u.uRes.value.set(ctx.width, ctx.height);
    u.uPx.value = ctx.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    const ndc = this.origin.set(0, 0, 0).project(cam);
    u.uLightNdc.value.set(ndc.x, ndc.y);

    const r = ctx.renderer;
    r.setRenderTarget(target);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(this.scene, cam);
  }

  look(t: number): SceneLook {
    const rush = this.warp.at(t) * (1 - 0.8 * this.moon.at(t));
    return {
      ...DEFAULT_LOOK,
      exposure: 1.0,
      saturation: 1.12,
      contrast: 1.04,
      bloomStrength: 0.2 + rush * 0.22,
      bloomRadius: 0.45,
      bloomThreshold: 1.0,
      painterly: 2.0,
      painterlyMix: 0.0,
      vignette: 0.42,
      grain: 0.035,
      aberration: 0.006 + rush * 0.03,
    };
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
  }
}
