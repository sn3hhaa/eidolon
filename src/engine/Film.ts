import * as THREE from 'three';
import { PostPipeline } from './PostPipeline';
import { easeFn } from './Track';
import {
  lerpLook,
  type FilmContext,
  type FilmScene,
  type SceneDef,
  type TransitionDef,
  type TransitionKind,
} from './types';

export interface Segment extends SceneDef {
  index: number;
  scene: FilmScene;
}

export interface FilmConfig {
  fps: number;
  width: number;
  height: number;
  scenes: SceneDef[];
  transitions: TransitionDef[];
}

/**
 * The film: an absolute-time master timeline over a list of scenes.
 *
 * `renderFrame(n)` draws frame n and nothing else influences the image — not
 * wall-clock time, not the previous frame, not playback history. Preview
 * playback, scrubbing, stills and the offline export all call this same
 * function, so what you scrub is exactly what gets encoded.
 */
export class Film {
  readonly fps: number;
  readonly duration: number;
  readonly totalFrames: number;
  readonly baseWidth: number;
  readonly baseHeight: number;
  readonly renderer: THREE.WebGLRenderer;
  readonly segments: Segment[];
  readonly transitions: TransitionDef[];

  width = 0;
  height = 0;
  scale = 1;
  /** Last rendered frame index. */
  frame = 0;
  /** Milliseconds the last frame took to submit (CPU side). */
  lastFrameMs = 0;

  private rtA!: THREE.WebGLRenderTarget;
  private rtB!: THREE.WebGLRenderTarget;
  private post!: PostPipeline;

  constructor(canvas: HTMLCanvasElement, config: FilmConfig, scale = 1) {
    this.fps = config.fps;
    this.baseWidth = config.width;
    this.baseHeight = config.height;
    this.transitions = config.transitions;
    this.segments = config.scenes.map((def, index) => ({ ...def, index, scene: def.create() }));
    this.duration = this.segments[this.segments.length - 1].end;
    this.totalFrames = Math.round(this.duration * this.fps);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    // Scenes render linear HDR into float targets; the finish pass encodes sRGB.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.autoClear = false;

    this.setScale(scale);
  }

  private get ctx(): FilmContext {
    return { renderer: this.renderer, width: this.width, height: this.height };
  }

  private makeTarget(): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
      samples: 4,
    });
  }

  /** Change the internal render resolution (1 = full 1920×1080). */
  setScale(scale: number): void {
    this.scale = scale;
    // keep dimensions even so H.264 (yuv420p) can encode previews
    this.width = Math.round((this.baseWidth * scale) / 2) * 2;
    this.height = Math.round((this.baseHeight * scale) / 2) * 2;
    this.renderer.setSize(this.width, this.height, false);
    this.rtA?.dispose();
    this.rtB?.dispose();
    this.rtA = this.makeTarget();
    this.rtB = this.makeTarget();
    if (this.post) this.post.setSize(this.width, this.height);
    else this.post = new PostPipeline(this.renderer, this.width, this.height);
  }

  async init(): Promise<void> {
    for (const seg of this.segments) await seg.scene.init(this.ctx);
  }

  segmentAt(time: number): Segment {
    for (const seg of this.segments) if (time < seg.end) return seg;
    return this.segments[this.segments.length - 1];
  }

  frameToTime(frame: number): number {
    return frame / this.fps;
  }

  timeToFrame(time: number): number {
    return Math.min(this.totalFrames - 1, Math.max(0, Math.floor(time * this.fps + 1e-6)));
  }

  /** Which scene(s) are on screen at `time`, and how they are mixed. */
  private resolve(time: number): { a: Segment; b: Segment | null; mix: number; kind: TransitionKind } {
    for (const tr of this.transitions) {
      if (time >= tr.start && time < tr.end) {
        const a = this.segments[tr.from];
        const b = this.segments[tr.from + 1];
        if (a && b && a.scene.built) {
          const u = (time - tr.start) / (tr.end - tr.start);
          return { a, b, mix: easeFn(tr.ease ?? 'sine.inOut')(u), kind: tr.kind };
        }
      }
    }
    return { a: this.segmentAt(time), b: null, mix: 0, kind: 'dissolve' };
  }

  /** Render one exact frame of the film to the canvas. */
  renderFrame(frame: number): void {
    const t0 = performance.now();
    frame = Math.min(this.totalFrames - 1, Math.max(0, Math.round(frame)));
    this.frame = frame;
    const time = frame / this.fps;
    const { a, b, mix, kind } = this.resolve(time);
    const ctx = this.ctx;

    a.scene.render(time - a.start, this.rtA, ctx);
    let look = a.scene.look(time - a.start);
    if (b) {
      b.scene.render(time - b.start, this.rtB, ctx);
      look = lerpLook(look, b.scene.look(time - b.start), mix);
    }

    this.post.render({
      texA: this.rtA.texture,
      texB: b ? this.rtB.texture : null,
      mix,
      kind,
      look,
      frame,
    });
    this.lastFrameMs = performance.now() - t0;
  }
}
