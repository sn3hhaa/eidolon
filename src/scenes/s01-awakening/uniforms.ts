import * as THREE from 'three';

/** Uniform objects shared by every material in the Awakening scene. */
export interface AwakeningUniforms {
  uTime: { value: number };
  /** Intensity of the central light. */
  uLight: { value: number };
  /** 0..1+ growth of the starburst. */
  uBurst: { value: number };
  /** Seconds since the burst ignited (negative before). */
  uBurstAge: { value: number };
  /** Outward shove applied to fragments and dust by the burst. */
  uPush: { value: number };
  /** 0..1 expanding shock ring. */
  uShock: { value: number };
  /** 0..1 streak elongation during the final rush. */
  uWarp: { value: number };
  /** Radius of the core disc (world units). */
  uCore: { value: number };
  /** 0..1 — the core's surface resolves into a moon. */
  uMoon: { value: number };
  /** Radius (world units) of the sphere of revealed sparkles. */
  uReveal: { value: number };
  /** Screen position of the light in NDC. */
  uLightNdc: { value: THREE.Vector2 };
  /** Render target size in pixels. */
  uRes: { value: THREE.Vector2 };
  /** Pixels per world unit at distance 1 (for point sprite sizing). */
  uPx: { value: number };
}

export function createUniforms(): AwakeningUniforms {
  return {
    uTime: { value: 0 },
    uLight: { value: 0 },
    uBurst: { value: 0 },
    uBurstAge: { value: -1 },
    uPush: { value: 0 },
    uShock: { value: 0 },
    uWarp: { value: 0 },
    uCore: { value: 0 },
    uMoon: { value: 0 },
    uReveal: { value: 0 },
    uLightNdc: { value: new THREE.Vector2() },
    uRes: { value: new THREE.Vector2(1920, 1080) },
    uPx: { value: 1500 },
  };
}
