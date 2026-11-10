import type * as THREE from 'three';

/** Per-scene grading / postprocessing parameters. Blended across transitions. */
export interface SceneLook {
  exposure: number;
  saturation: number;
  contrast: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  /** Kuwahara (painterly) filter radius in pixels at 1080p. 0 disables it. */
  painterly: number;
  /** 0..1 blend of the painterly filter over the raw image. */
  painterlyMix: number;
  vignette: number;
  grain: number;
  /** Radial chromatic aberration amount. */
  aberration: number;
}

export const DEFAULT_LOOK: SceneLook = {
  exposure: 1,
  saturation: 1,
  contrast: 1,
  bloomStrength: 0.4,
  bloomRadius: 0.6,
  bloomThreshold: 0.85,
  painterly: 0,
  painterlyMix: 0,
  vignette: 0.35,
  grain: 0.03,
  aberration: 0.0,
};

export function lerpLook(a: SceneLook, b: SceneLook, t: number): SceneLook {
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof SceneLook)[]) {
    out[k] = a[k] + (b[k] - a[k]) * t;
  }
  return out;
}

export interface FilmContext {
  renderer: THREE.WebGLRenderer;
  /** Internal render resolution in pixels (film resolution × preview scale). */
  width: number;
  height: number;
}

/**
 * One environment of the film.
 *
 * CONTRACT: `render(t)` must be a pure function of scene-local time `t`
 * (seconds since the scene's start on the master timeline). No accumulated
 * state, no clocks, no Math.random. `t` may run slightly below 0 or beyond the
 * scene's duration while a transition overlaps it.
 */
export interface FilmScene {
  /** false for scenes that are scheduled on the timeline but not built yet. */
  readonly built: boolean;
  init(ctx: FilmContext): void | Promise<void>;
  render(t: number, target: THREE.WebGLRenderTarget, ctx: FilmContext): void;
  look(t: number): SceneLook;
  dispose?(): void;
}

export type TransitionKind = 'dissolve' | 'luma';

export interface SceneDef {
  id: string;
  title: string;
  start: number;
  end: number;
  create: () => FilmScene;
}

export interface TransitionDef {
  /** Index of the outgoing scene; the incoming scene is `from + 1`. */
  from: number;
  start: number;
  end: number;
  kind: TransitionKind;
  ease?: string;
  /** The visual rhyme this transition is built on (documentation + dev UI). */
  motif: string;
}
