import type { Spec } from './cars';
import type { CarStyle } from './types';
export const SPECS: Record<CarStyle, Spec> = {
  sedan: { len: 4.45, wid: 1.72, hgt: 1.4, wb: 2.6, wr: 0.3, clear: 0.2, belt: [[-2.22, 0.9], [-1.5, 0.94], [0.95, 0.93], [2.22, 0.8]], gh: [-1.5, -0.82, 0.22, 1.0], tumble: 0.17, pillars: [-0.28], doors: [-1.12, -0.28, 0.72], nose: 0.2, tail: 0.16, axle: 0.02 },
  taxi: { len: 4.45, wid: 1.72, hgt: 1.4, wb: 2.6, wr: 0.3, clear: 0.2, belt: [[-2.22, 0.9], [-1.5, 0.94], [0.95, 0.93], [2.22, 0.8]], gh: [-1.5, -0.82, 0.22, 1.0], tumble: 0.17, pillars: [-0.28], doors: [-1.12, -0.28, 0.72], nose: 0.2, tail: 0.16, axle: 0.02 },
  hatch: { len: 3.75, wid: 1.62, hgt: 1.42, wb: 2.38, wr: 0.28, clear: 0.19, belt: [[-1.87, 0.92], [-1.3, 0.95], [0.75, 0.93], [1.87, 0.8]], gh: [-1.8, -1.22, 0.1, 0.84], tumble: 0.15, pillars: [-0.45], doors: [-0.45, 0.6], nose: 0.22, tail: 0.14, axle: 0.04, hub: 1 },
  wagon: { len: 4.6, wid: 1.74, hgt: 1.45, wb: 2.68, wr: 0.3, clear: 0.2, belt: [[-2.3, 0.94], [0.98, 0.94], [2.3, 0.8]], gh: [-2.24, -1.9, 0.28, 1.04], tumble: 0.15, pillars: [-1.28, -0.3], doors: [-1.28, -0.3, 0.74], nose: 0.2, tail: 0.1, axle: 0.02, hub: 1 },
  pickup: { len: 4.9, wid: 1.8, hgt: 1.62, wb: 3.0, wr: 0.34, clear: 0.27, belt: [[-2.45, 1.0], [-0.55, 1.0], [-0.45, 1.06], [1.0, 1.05], [2.45, 0.95]], gh: [-0.52, -0.3, 0.45, 1.1], tumble: 0.12, pillars: [], doors: [-0.42, 0.78], nose: 0.12, tail: 0.04, axle: 0.1, hub: 2, tire: 0.23, crown: 0.02 },
  van: { len: 4.7, wid: 1.86, hgt: 1.98, wb: 2.9, wr: 0.32, clear: 0.24, belt: [[-2.35, 1.12], [1.5, 1.12], [2.35, 0.86]], gh: [-2.34, -2.2, 1.1, 1.72], tumble: 0.07, pillars: [0.2], doors: [-0.9, 0.2, 1.24], nose: 0.14, tail: 0.05, axle: 0.1, hub: 2, bumper: 'dark', crown: 0.02 },
  suv: { len: 4.5, wid: 1.84, hgt: 1.72, wb: 2.66, wr: 0.36, clear: 0.3, belt: [[-2.25, 1.08], [1.0, 1.08], [2.25, 1.0]], gh: [-2.18, -1.88, 0.3, 0.98], tumble: 0.11, pillars: [-1.2, -0.25], doors: [-1.2, -0.25, 0.76], nose: 0.12, tail: 0.07, axle: 0.02, hub: 2, tire: 0.25, bumper: 'dark', crown: 0.022 },
  mini: { len: 3.1, wid: 1.46, hgt: 1.36, wb: 2.05, wr: 0.25, clear: 0.17, belt: [[-1.55, 0.84], [0.62, 0.86], [1.55, 0.74]], gh: [-1.5, -1.12, 0.05, 0.66], tumble: 0.13, pillars: [], doors: [-0.42, 0.5], nose: 0.26, tail: 0.2, axle: 0.02, hub: 1, tire: 0.17 },
};
