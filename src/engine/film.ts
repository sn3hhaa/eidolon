/** Absolute-time film runner: shots with hard cuts, sub-frame motion blur, deterministic seeking. */
import * as THREE from 'three';
import { Post, type Look } from './post';

export const FPS = 30;
export const DURATION = 90;
export const TOTAL_FRAMES = FPS * DURATION;

export interface Shot { name: string; t0: number; t1: number }
export interface Production {
  scene: THREE.Scene; camera: THREE.PerspectiveCamera; look: Look; shots: Shot[];
  /** Pose the whole world for absolute film time t. Called once per sub-frame, in increasing t within a frame. */
  update(t: number, shot: Shot): void;
  /** Optional 2D overlay (titles). Return its opacity; draw only when `dirty` asks. */
  overlay?(t: number, g: CanvasRenderingContext2D): number;
}

export class Film {
  post: Post;
  constructor(public renderer: THREE.WebGLRenderer, w: number, h: number, public prod: Production) { this.post = new Post(renderer, w, h); }
  shotAt(t: number) { const s = this.prod.shots; let cur = s[0]; for (const x of s) if (t >= x.t0 - 1e-6) cur = x; return cur; }
  render(t: number, blur = 1, shutter = 0.5) {
    const shot = this.shotAt(t), p = this.prod;
    this.post.begin();
    for (let i = 0; i < blur; i++) {
      let ts = blur === 1 ? t : t + ((i + 0.5) / blur - 0.5) * shutter / FPS;
      ts = Math.min(Math.max(ts, shot.t0), shot.t1 - 1e-4);
      p.update(ts, shot);
      this.post.sub(p.scene, p.camera, p.look, 1 / blur);
    }
    let oa = 0;
    if (p.overlay) { const g = this.post.overlay.getContext('2d')!; g.clearRect(0, 0, 1920, 1080); oa = p.overlay(t, g); if (oa > 0) this.post.overlayTex.needsUpdate = true; }
    this.post.end(p.look, oa);
  }
}
