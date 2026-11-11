// Debug: report where the protagonist's ground track passes through solid set pieces.
import * as THREE from 'three';
import { defaultLook } from '../engine/post';
import { buildGround } from '../world/ground';
import { buildBuildings } from '../world/buildings';
import { perform } from '../shots/perform';

export async function build() {
  const g = buildGround(), b = buildBuildings(), hits: string[] = [], seen = new Set<string>();
  const solids = [...g.solids.map((s) => ['G', s] as const), ...b.solids.map((s) => ['B', s] as const)];
  for (let s = 0; s < 95; s += 0.05) {
    const p = perform(s).root.pos;
    for (const [tag, [x0, z0, x1, z1, h]] of solids) {
      const m = 0.3; if (p.x > x0 - m && p.x < x1 + m && p.z > z0 - m && p.z < z1 + m && p.y < h - 0.05 && h > 0.2) { const k = `${tag}${x0.toFixed(1)},${z0.toFixed(1)}`; if (!seen.has(k)) { seen.add(k); hits.push(`σ${s.toFixed(1)} at (${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)}) in ${tag}[${x0.toFixed(1)},${z0.toFixed(1)}→${x1.toFixed(1)},${z1.toFixed(1)} h${h.toFixed(1)}]`); } }
    }
  }
  const near = (x0: number, z0: number, x1: number, z1: number) => g.solids.filter((s) => s[2] > x0 && s[0] < x1 && s[3] > z0 && s[1] < z1).map((s) => `[${s.map((v) => v.toFixed(1)).join(',')}]`).join(' ');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  return { scene, camera, look: defaultLook(), shots: [{ name: 'd', t0: 0, t1: 90 }], update() {},
    debug: `HITS ${hits.length}\n${hits.join('\n')}\nSPLASH solids: ${near(6, 9.5, 30, 26)}\nSIDEWALK S x-6..45 z5..9.5: ${near(-6, 5, 45, 9.5)}\nDECK: ${near(56, 5, 61.5, 42)}\nTERRACE: ${near(56, 42, 78, 58)}\nPROM x20..75 z64..84: ${near(20, 64, 75, 84)}\nROAD x-62..-8 z2..5: ${near(-62, 2, -8, 5)}\nSIG ${JSON.stringify(g.anchors.signals)} SEATS ${JSON.stringify(g.anchors.cafeSeats.slice(0, 6))} HOOP ${JSON.stringify(g.anchors.hoop)} BENCH ${JSON.stringify(g.anchors.benches.filter((b) => b.z > 60 && b.x > 20 && b.x < 50))}` };
}
