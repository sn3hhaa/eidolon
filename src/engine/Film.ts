/**
 * The film: an absolute-time timeline of nine connected scenes. Adjacent scenes
 * overlap by ~1 s; during the overlap the outgoing scene exposes a *portal* (a
 * world-space sphere somewhere in its set — a crack, a mouth, a fruit, a bell…)
 * and the incoming scene is rendered live inside it, depth-occluded by the
 * outgoing scene's geometry, until the camera passes through.
 */
import * as THREE from 'three';
import type { LightRig } from './paint';
import { Post, type Look, type PortalState, mixLook } from './post';
import { bell, clamp01, sramp } from './anim';

export const FPS = 30;
export const DURATION = 90;
export const TOTAL_FRAMES = FPS * DURATION;

/** [start, end) of each scene in seconds. Overlaps are the portal transitions. */
export const TL: Record<string, [number, number]> = {
  s1: [0, 10.5], s2: [9.5, 20.5], s3: [19.5, 30.5], s4: [29.5, 40.5], s5: [39.5, 50.5],
  s6: [49.5, 60.5], s7: [59.5, 70.5], s8: [69.5, 80.5], s9: [79.5, 90.01],
};
export const ORDER = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'];

export interface PortalDef {
  center: THREE.Vector3; radius: number;
  stretch?: [number, number]; rim?: THREE.ColorRepresentation; rimI?: number; occlude?: boolean;
}
export interface Built {
  scene: THREE.Scene; camera: THREE.PerspectiveCamera; rig: LightRig; look: Look;
  /** Pose everything for absolute film time t (seconds). Must be a pure function of t. */
  update(t: number): void;
  /** Exit portal in this scene's world space, queried during the overlap with the next scene. */
  portal?(t: number): PortalDef | null;
}

const loaders = import.meta.glob('../scenes/s*.ts') as Record<string, () => Promise<{ build: () => Built }>>;

export class Film {
  built = new Map<string, Built>();
  post: Post;
  errors: string[] = [];
  private v = new THREE.Vector3();
  private ps: PortalState = { center: new THREE.Vector2(), radius: 0, stretch: [1, 1], depth: 0, rim: new THREE.Color(), rimI: 1 };

  constructor(public renderer: THREE.WebGLRenderer, w: number, h: number) {
    this.post = new Post(renderer, w, h, makeTitle());
  }

  async load(only?: string[]) {
    for (const id of ORDER) {
      if (only && !only.includes(id)) continue;
      const ld = loaders[`../scenes/${id}.ts`];
      if (!ld) continue;
      try {
        const mod = await ld();
        const b = mod.build();
        b.scene.matrixWorldAutoUpdate = true;
        this.built.set(id, b);
      } catch (e: any) {
        this.errors.push(`${id}: ${e?.stack ?? e}`);
        console.error(e);
      }
    }
  }

  render(t: number) {
    const active = ORDER.filter((id) => this.built.has(id) && t >= TL[id][0] && t < TL[id][1]);
    if (!active.length) {
      this.renderer.setRenderTarget(null); this.renderer.setClearColor(0x000000, 1); this.renderer.clear();
      return;
    }
    const aId = active[0], bId = active[1];
    const A = this.built.get(aId)!, B = bId ? this.built.get(bId)! : null;
    A.rig.time = t; A.update(t);
    let look = A.look, portal: PortalState | null = null;
    if (B) {
      B.rig.time = t; B.update(t);
      const def = A.portal?.(t) ?? null;
      const u = clamp01((t - TL[bId][0]) / (TL[aId][1] - TL[bId][0]));
      const cam = A.camera, ps = this.ps;
      let radius = 0;
      ps.depth = 0;
      if (def) {
        const v = this.v.copy(def.center).applyMatrix4(cam.matrixWorldInverse);
        const dist = v.length(), vz = -v.z;
        const th = Math.tan((cam.fov * Math.PI) / 360);
        if (dist < def.radius * 1.02) radius = 12;
        else if (vz > 0.01) {
          radius = Math.min(12, def.radius / (Math.sqrt(Math.max(dist * dist - def.radius * def.radius, 1e-6)) * th));
          ps.center.set(v.x / (vz * th * cam.aspect), v.y / (vz * th));
          if (def.occlude !== false) ps.depth = Math.max(0, vz - def.radius);
        }
        ps.stretch = def.stretch ?? [1, 1];
        ps.rim.set(def.rim ?? '#fff1c8'); ps.rimI = def.rimI ?? 1.5;
      } else { ps.center.set(0, 0); ps.stretch = [1, 1]; ps.rimI = 0; }
      radius += Math.pow(u, 5) * 5; // guarantee the hand-over completes
      if (u > 0.92) ps.depth = 0;
      ps.radius = radius;
      portal = ps;
      this.post.drawScene(B.scene, B.camera, B.look, 'B');
      look = mixLook(A.look, B.look, sramp(u, 0.3, 1));
    }
    this.post.drawScene(A.scene, A.camera, A.look, 'A');
    look = { ...look, fade: look.fade * sramp(t, 0.0, 1.4) };
    const title = bell(t, 86.9, 88.1, 89.2, 89.95);
    this.post.present(look, t, portal, A.camera, title);
  }
}

function makeTitle() {
  const c = document.createElement('canvas');
  c.width = 1920; c.height = 1080;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 1920, 1080);
  g.textAlign = 'center'; g.fillStyle = '#f3e6c8';
  (g as any).letterSpacing = '38px';
  g.font = '400 112px "Palatino Linotype", "Book Antiqua", Georgia, serif';
  g.fillText('EIDOLON', 960 + 19, 545);
  (g as any).letterSpacing = '9px';
  g.font = 'italic 400 34px "Palatino Linotype", "Book Antiqua", Georgia, serif';
  g.fillStyle = '#e9b98a';
  g.fillText('the museum of impossible things', 960 + 4, 618);
  g.fillStyle = '#e9b98a';
  g.fillRect(960 - 60, 652, 120, 1.5);
  return c;
}
