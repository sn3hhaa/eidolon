/** Placement anchors for vehicles and extras (nothing is built here except two court-side benches). */
import { rng } from '../../engine/look';
import { CURB, L } from '../layout';
import { type Ctx, anchor } from './kit';
import { bench } from './props';

export function buildAnchors(c: Ctx) {
  const Y = CURB, R = rng(7), hb = L.harbor;
  // kerbside parallel-parking bays (vehicle centre, heading ry = atan2(dirX, dirZ)); all left EMPTY
  for (let x = -114; x <= 106; x += 6.2) {
    if (x > 34 && x < 61) continue; if (x > -8.5 && x < 4.5) continue;
    anchor(c, 'parking', x, 0, -4.05, -Math.PI / 2);                                             // north kerb, facing west
    if ((x > -43 && x < -19) || (x > 15 && x < 47) || (x > -57.5 && x < -45)) continue;          // barrier run-up, stunt line, bus stop
    anchor(c, 'parking', x, 0, 4.05, Math.PI / 2);                                               // south kerb, facing east
  }
  for (let z = -66; z <= 58; z += 6.2) {
    if (Math.abs(z) < 15) continue;
    anchor(c, 'parking', hb.x - hb.halfRoad + 0.95, 0, z, 0);                                    // west kerb, facing south
    if (z < 0) anchor(c, 'parking', hb.x + hb.halfRoad - 0.95, 0, z, Math.PI);                   // east kerb, facing north (kept clear south of Main: bus route)
  }
  // sidewalk standing/walking spots
  for (let x = -110; x <= 104; x += 9) {
    if (x > 37 && x < 58) continue;
    anchor(c, 'pedSpots', x + R.range(-2, 2), Y, R() < 0.5 ? -7.1 : -8.2, R() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    if (x > 16 && x < 46) continue;
    anchor(c, 'pedSpots', x + 4 + R.range(-2, 2), Y, R() < 0.5 ? 7.1 : 8.3, R() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
  }
  for (const z of [-58, -44, -31, -19, 17, 29, 41, 53]) anchor(c, 'pedSpots', 41.5 + R.range(-0.5, 0.5), Y, z, R() < 0.5 ? 0 : Math.PI);
  for (const z of [-52, -38, -24, -13]) anchor(c, 'pedSpots', 54.4 + R.range(-0.5, 0.5), Y, z, R() < 0.5 ? 0 : Math.PI);
  for (const z of [14, 25, 36]) anchor(c, 'pedSpots', 57.9, Y, z, R() < 0.5 ? 0 : Math.PI);     // under the arcade
  // crosswalk centres (ry = walking axis)
  anchor(c, 'crosswalks', 41.75, 0, 0, 0); anchor(c, 'crosswalks', 54.25, 0, 0, 0); anchor(c, 'crosswalks', 48, 0, 7.25, Math.PI / 2); anchor(c, 'crosswalks', 48, 0, -7.25, Math.PI / 2); anchor(c, 'crosswalks', -2, 0, 0, 0);
  // the court: player spots + sideline benches
  const ct = L.court;
  for (const [x, z, ry] of [[-14, 20.5, 0], [-17.2, 17.2, 0.5], [-10.6, 18.4, -0.5], [-12.4, 23.2, 0.2], [-19.5, 22, 1.0]]) anchor(c, 'court', x, Y, z, ry);
  bench(c, ct.x0 + 1.2, Y, 12.6, Math.PI / 2); bench(c, ct.x1 - 1.3, Y, 12.8, -Math.PI / 2);
  for (const [x, z, ry] of [[-21.5, 14.8, 1.2], [-6.6, 11.2, -1.6], [-9.5, 10.6, 3.0]]) anchor(c, 'pedSpots', x, Y, z, ry);
  anchor(c, 'barrier', L.barrier.x, 0, L.barrier.z); anchor(c, 'ledge', (L.ledge.x0 + L.ledge.x1) / 2, Y + L.ledge.height, L.ledge.z); anchor(c, 'bankLip', L.bank.x1, Y + L.bank.height, (L.bank.z0 + L.bank.z1) / 2);
}
