/**
 * NO SIGNAL — buildings, trees and the backdrop ring (static set dressing on the building lots).
 * Ground, street furniture, stunt geometry, promenade and sea live in ./ground.ts.
 */
import * as THREE from 'three';
import { rng } from '../engine/look';
import { Batch } from './buildings/kit';
import { building, pickStyle, type BOpts, type Lot, type Side } from './buildings/block';
import { tileMat } from './buildings/paint2';
import { SignAtlas } from './buildings/signs';
import { buildTrees } from './buildings/trees';
import { buildBackdrop } from './buildings/backdrop';

export interface Buildings { group: THREE.Group; setTime(tw: number): void; solids: [number, number, number, number, number][] }

interface RowOpts { floors: [number, number]; seed: number; end0?: 'shop' | 'plain'; end1?: 'shop' | 'plain'; back?: boolean; wmin?: number; wmax?: number; simple?: boolean; names?: string[][]; frontPlain?: boolean; base?: number; pool?: boolean; all?: boolean; ivy?: number }

export function buildBuildings(): Buildings {
  const B = new Batch(), signs = new SignAtlas(), solids: number[][] = [];
  const OPP: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const PR = rng(909), pool = Array.from({ length: 7 }, () => { const st = pickStyle(PR); return { st, tile: tileMat(st, PR) }; });

  /** A terrace of buildings along x (front N or S) or along z (front E or W). a = along-axis range, b = depth range. */
  const row = (front: Side, a0: number, a1: number, b0: number, b1: number, o: RowOpts) => {
    const R = rng(o.seed), alongX = front === 'N' || front === 'S', cuts = [a0];
    while (a1 - cuts[cuts.length - 1] > (o.wmax ?? 16) ) cuts.push(cuts[cuts.length - 1] + R.range(o.wmin ?? 9, o.wmax ?? 16));
    if (a1 - cuts[cuts.length - 1] < 6 && cuts.length > 1) cuts.pop();
    cuts.push(a1);
    const s0: Side = alongX ? 'W' : 'N', s1: Side = alongX ? 'E' : 'S';
    for (let i = 0; i < cuts.length - 1; i++) {
      const lot: Lot = alongX ? { x0: cuts[i], x1: cuts[i + 1], z0: b0, z1: b1 } : { x0: b0, x1: b1, z0: cuts[i], z1: cuts[i + 1] };
      const bo: BOpts = { floors: R.int(o.floors[0], o.floors[1]), shop: o.frontPlain ? [] : [front], plain: o.frontPlain ? [front] : [], seed: o.seed * 97 + i * 13 + 5, simple: o.simple, names: o.names?.[i], base: o.base, ivy: o.ivy, pool: o.pool ? R.pick(pool) : undefined };
      if (o.all) bo.plain = (['N', 'S', 'E', 'W'] as Side[]).filter((s) => !bo.shop!.includes(s));
      if (i === 0 && o.end0) (o.end0 === 'shop' ? bo.shop! : bo.plain!).push(s0);
      if (i === cuts.length - 2 && o.end1) (o.end1 === 'shop' ? bo.shop! : bo.plain!).push(s1);
      if (i > 0 && !bo.plain!.includes(s0)) bo.plain!.push(s0);            // party walls show above lower neighbours
      if (i < cuts.length - 2 && !bo.plain!.includes(s1)) bo.plain!.push(s1);
      if (o.back) bo.plain!.push(OPP[front]);
      building(B, signs, lot, bo, solids);
    }
  };

  // ── first rows along Main Street ──
  row('S', -120, 40, -26, -9.5, { floors: [2, 5], seed: 11, end1: 'shop', end0: 'plain' });
  row('S', 56, 112, -26, -9.5, { floors: [3, 5], seed: 12, end0: 'shop', end1: 'plain' });
  row('N', -120, -24, 9.5, 26, { floors: [2, 5], seed: 13, end1: 'plain', end0: 'plain', back: true, ivy: 0.25 });
  row('N', -4, 6, 9.5, 26, { floors: [3, 3], seed: 14, end0: 'plain', end1: 'plain', back: true, wmax: 20, ivy: 0.7 });
  row('N', 61.5, 112, 9.5, 26, { floors: [3, 5], seed: 15, end0: 'plain', end1: 'plain' });
  // ── Harbor Avenue ──
  row('E', -72, -26, 26, 40, { floors: [3, 5], seed: 21, end0: 'plain' });
  row('W', -72, -26, 56, 72, { floors: [3, 6], seed: 22, end0: 'plain' });
  row('E', 26, 60, 30, 40, { floors: [3, 4], seed: 23, end0: 'shop', end1: 'shop', wmin: 10, wmax: 13 });
  // ── behind the plazas / promenade front ──
  row('N', -24, 6, 28, 44, { floors: [3, 4], seed: 31, end0: 'plain', frontPlain: true, wmin: 8, wmax: 12, ivy: 0.6 });
  row('N', 6, 30, 26, 44, { floors: [3, 4], seed: 34, frontPlain: true, wmin: 8, wmax: 12, ivy: 0.6 });
  row('N', -70, -24, 28, 44, { floors: [3, 5], seed: 32, simple: true, frontPlain: true });
  row('S', -70, 30, 44, 60, { floors: [3, 5], seed: 33, end0: 'shop', names: [['HOTEL MIRAMAR'], ['CAFÉ AZUL', 'GULL & ANCHOR'], ['LA ONDA'], ['SEA BREEZE INN'], ['BOARDWALK BITES', 'OKA GELATO'], ['ZEST JUICE'], ['SALTLINE SURF']] });
  // ── east of the High Walk / terrace ──
  row('S', 61.5, 78, 26, 42, { floors: [3, 3], seed: 41, end0: 'plain', wmax: 20, base: 2.75, names: [['COPPER KETTLE', 'MIRA FLORA', 'SODA POP']] });
  row('W', 42, 54, 78, 94, { floors: [3, 3], seed: 42, base: 2.75, wmax: 20, end1: 'plain', names: [['STUDIO KOI', 'BON BON']] });
  row('S', 78, 94, 54, 60, { floors: [4, 4], seed: 44, end0: 'plain', wmax: 20 });
  row('W', 26, 42, 78, 94, { floors: [5, 5], seed: 45, simple: true, frontPlain: true, wmax: 20 });
  row('S', 94, 112, 44, 60, { floors: [3, 4], seed: 43, end1: 'plain', wmax: 20 });

  // ── second rows and street-end closures (pooled facades, taller) ──
  const P = { pool: true, simple: true, frontPlain: true, all: true, wmin: 14, wmax: 24 } as const;
  row('S', -120, 24, -50, -28, { floors: [5, 8], seed: 51, ...P });
  row('S', 74, 112, -50, -28, { floors: [5, 8], seed: 52, ...P });
  row('E', -74, -50, 6, 24, { floors: [5, 7], seed: 53, ...P });
  row('W', -74, -28, 74, 92, { floors: [5, 8], seed: 54, ...P });
  row('S', -120, -70, 28, 60, { floors: [4, 7], seed: 55, ...P });
  row('S', 94, 112, 26, 44, { floors: [5, 6], seed: 56, ...P });
  row('E', -32, 32, -142, -124, { floors: [4, 6], seed: 57, ...P });          // west end of Main St
  row('W', -32, 62, 116, 134, { floors: [4, 7], seed: 58, ...P });            // east end of Main St
  row('S', 14, 82, -94, -76, { floors: [5, 7], seed: 59, ...P });             // north end of Harbor Ave
  row('S', -150, -124, -62, -34, { floors: [6, 9], seed: 60, ...P }); row('S', 116, 150, -62, -34, { floors: [6, 9], seed: 61, ...P });

  const trees = buildTrees(solids);
  const group = new THREE.Group();
  group.add(B.build(), trees.group, buildBackdrop(B.tris));
  group.userData.tris = B.tris + trees.tris;
  return { group, setTime: (tw) => trees.setTime(tw), solids: solids as Buildings['solids'] };
}
