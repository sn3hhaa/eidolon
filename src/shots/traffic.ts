/** Traffic: parked cars, moving cars and the bus, all pure functions of WORLD time tw (frozen at TFZ). */
import * as THREE from 'three';
import { makeCar, makeBus, type Vehicle, type CarStyle } from '../world/vehicles';
import type { Ground } from '../world/ground';
import { Path, hash, sstep } from './util';
import { BUS } from './perform';

/** world time at which everything stops */
export const TFZ = 12;
const COLORS = ['#d9482b', '#2f6fd0', '#f2c230', '#3f9a6b', '#f4efe2', '#7a4fb0', '#e8823a', '#23a0a8', '#c23a5e', '#5b6b7a', '#f0b8c0', '#8fbf4a'];
const STYLES: CarStyle[] = ['sedan', 'hatch', 'wagon', 'pickup', 'van', 'suv', 'mini', 'sedan', 'hatch', 'mini'];

interface Mover { v: Vehicle; x0: number; z0: number; yaw: number; speed: number; wait?: number }

export function buildTraffic(ground: Ground) {
  const group = new THREE.Group(), movers: Mover[] = [];
  // parked cars in a deterministic subset of the kerbside bays
  let n = 0;
  ground.anchors.parking.forEach((b, i) => {
    const southMain = b.z > 0 && b.z < 6 && b.x < 40, clear = southMain && ((b.x > -70 && b.x < -40) || (b.x > -19 && b.x < 15));
    if (clear || hash(i * 7.3 + 1) > 0.52 || n >= 30) return;
    const c = makeCar(STYLES[Math.floor(hash(i * 3.1) * STYLES.length)], COLORS[Math.floor(hash(i * 5.7 + 2) * COLORS.length)], i + 3);
    c.group.position.set(b.x, 0, b.z); c.group.rotation.y = (b.ry ?? 0) + (hash(i) - 0.5) * 0.04; group.add(c.group); n++;
  });
  const E = Math.PI / 2, W = -Math.PI / 2, S = 0, Nn = Math.PI;
  const add = (style: CarStyle, color: string, x0: number, z0: number, yaw: number, speed: number, wait?: number) => { const v = makeCar(style, color, movers.length + 40, { driver: true }); group.add(v.group); movers.push({ v, x0, z0, yaw, speed, wait }); if (wait !== undefined) v.lights.brake(true); };
  add('sedan', '#d9482b', -7.0, 1.55, E, 9, 2.2); add('hatch', '#f2c230', 3.2, -1.55, W, 9, 2.7);
  add('taxi', '#f2b400', 13.6, 1.55, E, 8.5); add('van', '#f4efe2', 24, -1.55, W, 8); add('wagon', '#3f9a6b', -24, -1.55, W, 8.5); add('suv', '#7a4fb0', -41, 1.55, E, 8.2);
  add('pickup', '#23a0a8', 74, -1.55, W, 8); add('mini', '#e8823a', 86, 1.55, E, 8); add('sedan', '#2f6fd0', -70, -1.55, W, 8.5); add('hatch', '#c23a5e', -88, 1.55, E, 8.5);
  add('sedan', '#5b6b7a', 45.75, -8.2, S, 8, 999); add('hatch', '#8fbf4a', 50.25, 23, Nn, 1.6); add('wagon', '#f0b8c0', 50.25, 34, Nn, 1.4); add('mini', '#2f6fd0', 50.25, 46, Nn, 1.2);
  // the bus: up Harbor Ave and right onto Main St; at tw = TFZ it is exactly at BUS, tilted through the turn
  const bus = makeBus(); group.add(bus.group);
  const bp = new Path([[50.25, 64], [50.25, 34], [50.2, 18], [49.95, 11.8], [BUS.x, BUS.z], [53.5, 4.0], [57, 2.0], [63, 1.55], [80, 1.55], [112, 1.55]]), bs0 = bp.near(BUS.x, BUS.z), yawFix = BUS.yaw - bp.yaw(bs0), curv0 = bp.curv(bs0);
  const jit = (i: number, tf: number, a: number) => a * Math.sin(tf * 71 + i * 2.3) * Math.sin(tf * 43 + i * 5.1);

  return {
    group, bus,
    /** tw: world time; tremble 0..1: strength of the pre-resume shiver; tf: film time (drives the shiver only) */
    set(tw: number, tremble = 0, tf = 0) {
      const dt = tw - TFZ;
      movers.forEach((m, i) => {
        const d = m.wait === undefined ? m.speed * dt : dt < m.wait ? 0 : Math.min(m.speed * (dt - m.wait), 0.5 * 2.2 * (dt - m.wait) ** 2);
        m.v.group.position.set(m.x0 + Math.sin(m.yaw) * d, jit(i, tf, 0.006 * tremble), m.z0 + Math.cos(m.yaw) * d); m.v.group.rotation.y = m.yaw;
        m.v.body.rotation.z = jit(i + 9, tf, 0.012 * tremble); m.v.body.rotation.x = jit(i + 4, tf, 0.008 * tremble);
        for (const w of m.v.wheels) w.rotation.x = d / m.v.wheelRadius;
        if (m.wait !== undefined) m.v.lights.brake(dt < m.wait);
      });
      const s = bs0 + 4.6 * dt, p = bp.at(s), k = bp.curv(s) / curv0;
      bus.group.position.set(p.x, 0, p.y); bus.group.rotation.y = bp.yaw(s) + yawFix * sstep(14, 0, Math.abs(s - bs0));
      bus.body.rotation.z = BUS.roll * THREE.MathUtils.clamp(k, 0, 1.15) + jit(31, tf, 0.01 * tremble); bus.body.rotation.x = jit(17, tf, 0.006 * tremble);
      for (const w of bus.wheels) w.rotation.x = (s - bs0) / bus.wheelRadius;
      for (const st of bus.steer) st.rotation.y = -THREE.MathUtils.clamp(bp.curv(s + 2) * 6.5, -0.6, 0.6);
      bus.lights.indicate('r', Math.abs(s - bs0) < 16 && Math.floor(tw * 2.4) % 2 === 0);
    },
  };
}
