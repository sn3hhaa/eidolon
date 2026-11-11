/**
 * NO SIGNAL — static ground set: streets, plazas, stunt geometry, High Walk, terrace, stairs,
 * promenade, sea and street furniture. Geometry follows src/world/layout.ts exactly.
 */
import * as THREE from 'three';
import { Batch, type Anchors, type Ctx } from './ground/kit';
import { buildSurfaces } from './ground/surfaces';
import { buildPlazas } from './ground/plazas';
import { buildStunt } from './ground/stunt';
import { buildHighWalk } from './ground/highwalk';
import { buildTerrace } from './ground/terrace';
import { buildWaterfront } from './ground/waterfront';
import { buildSea } from './ground/sea';
import { buildHarbor } from './ground/harbor';
import { buildPlazas2 } from './ground/plazas2';
import { buildFurniture } from './ground/furniture';
import { buildFurniture2 } from './ground/furniture2';
import { buildAnchors } from './ground/anchors';

export interface Ground {
  group: THREE.Group;
  setTime(tw: number): void;
  setSignals(main: 'g' | 'y' | 'r' | 'off', harbor: 'g' | 'y' | 'r' | 'off'): void;
  solids: [number, number, number, number, number][];
  anchors: Anchors;
  stats: { triangles: number; drawCalls: number };
}

export function buildGround(): Ground {
  const group = new THREE.Group(); group.name = 'ground';
  const c: Ctx = { b: new Batch(), group, solids: [], anchors: {}, tick: [] };
  let setSignals: Ground['setSignals'] = () => {};
  buildSurfaces(c);
  buildPlazas(c);
  buildStunt(c);
  buildHighWalk(c);
  buildTerrace(c);
  buildWaterfront(c);
  buildSea(c);
  buildHarbor(c);
  buildPlazas2(c);
  setSignals = buildFurniture(c);
  buildFurniture2(c);
  buildAnchors(c);
  const calls = c.b.build(group);
  let extra = 0, tris = c.b.tris; group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) extra++; });
  return { group, setTime: (tw) => { for (const f of c.tick) f(tw); }, setSignals: (m, h) => setSignals(m, h), solids: c.solids, anchors: c.anchors, stats: { triangles: Math.round(tris), drawCalls: Math.max(calls, extra) } };
}
