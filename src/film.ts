import type { FilmConfig } from './engine/Film';
import { PendingScene } from './engine/PendingScene';
import { AwakeningScene } from './scenes/s01-awakening/AwakeningScene';

/**
 * EIDOLON master timeline — 90 s, 30 fps, 2700 frames, 1920×1080.
 *
 * Scenes not yet built are scheduled as PendingScene (pure black) so the
 * timeline, seeking and export always cover the full 90 seconds and the
 * unfinished parts are obvious.
 */
const pending = () => new PendingScene();

export const FILM: FilmConfig = {
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    { id: '01-awakening', title: 'The Awakening', start: 0, end: 10, create: () => new AwakeningScene() },
    { id: '02-forgotten-gate', title: 'The Forgotten Gate', start: 10, end: 20, create: pending },
    { id: '03-impossible-forest', title: 'The Impossible Forest', start: 20, end: 30, create: pending },
    { id: '04-garden-of-stars', title: 'The Garden of Stars', start: 30, end: 40, create: pending },
    { id: '05-celestial-herd', title: 'The Celestial Herd', start: 40, end: 50, create: pending },
    { id: '06-midnight-carnival', title: 'The Midnight Carnival', start: 50, end: 60, create: pending },
    { id: '07-floating-city', title: 'The Floating City', start: 60, end: 70, create: pending },
    { id: '08-last-memory', title: 'The Last Memory', start: 70, end: 80, create: pending },
    { id: '09-return', title: 'The Return', start: 80, end: 90, create: pending },
  ],
  transitions: [
    { from: 0, start: 9.7, end: 10.3, kind: 'luma', motif: 'the glowing core swells into a moon disc → the moon over the gate' },
    { from: 1, start: 19.6, end: 20.4, kind: 'dissolve', motif: 'a ripple ring on the water → the outline of a flower petal' },
    { from: 2, start: 29.6, end: 30.4, kind: 'luma', motif: 'the luminous flower centre → a field of stars' },
    { from: 3, start: 39.6, end: 40.4, kind: 'dissolve', motif: 'a falling star → the celestial eye-being' },
    { from: 4, start: 49.6, end: 50.4, kind: 'dissolve', motif: 'descent into the rainbow portal → carnival tunnel' },
    { from: 5, start: 59.6, end: 60.4, kind: 'luma', motif: 'a glowing mechanical object leaves the carnival → an aircraft' },
    { from: 6, start: 69.6, end: 70.4, kind: 'luma', motif: 'a bright aircraft window → the glow of a campfire' },
    { from: 7, start: 79.6, end: 80.4, kind: 'luma', motif: 'rising sparks → celestial particles' },
  ],
};
