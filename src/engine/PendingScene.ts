import type * as THREE from 'three';
import { DEFAULT_LOOK, type FilmContext, type FilmScene, type SceneLook } from './types';

/**
 * Stand-in for a scene that is scheduled on the timeline but has not been
 * built yet. It renders pure black — deliberately NOT a fake environment — so
 * unfinished parts of the film are impossible to mistake for finished ones.
 * The dev UI labels these segments as "not built".
 */
export class PendingScene implements FilmScene {
  readonly built = false;

  init(): void {}

  render(_t: number, target: THREE.WebGLRenderTarget, ctx: FilmContext): void {
    const r = ctx.renderer;
    r.setRenderTarget(target);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
  }

  look(): SceneLook {
    return DEFAULT_LOOK;
  }
}
