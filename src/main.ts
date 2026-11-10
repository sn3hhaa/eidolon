import * as THREE from 'three';
import { Film, FPS, DURATION, TOTAL_FRAMES, TL } from './engine/film';

const q = new URLSearchParams(location.search);
const filmMode = q.has('film');
const scale = Number(q.get('scale') ?? (filmMode ? 1 : 0.5));
const only = q.get('only')?.split(',');
const W = Math.round(1920 * scale), H = Math.round(1080 * scale);

const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = W; canvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.autoClear = true;

const film = new Film(renderer, W, H);
const errors: string[] = film.errors;
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

const api = {
  fps: FPS, duration: DURATION, totalFrames: TOTAL_FRAMES, errors, timeline: TL,
  ready: film.load(only).then(() => true),
  built: () => [...film.built.keys()],
  gpu: () => {
    const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  },
  renderAt(t: number) { film.render(t); },
  capture(t: number, type = 'image/png', quality = 0.92) {
    film.render(t);
    return canvas.toDataURL(type, quality);
  },
};
(window as any).__eidolon = api;

if (!filmMode) {
  // minimal preview transport
  const bar = document.getElementById('bar') as HTMLInputElement;
  const lab = document.getElementById('lab')!;
  let t = Number(q.get('t') ?? 0), playing = !q.has('t'), last = performance.now();
  bar.max = String(DURATION);
  bar.addEventListener('input', () => { t = Number(bar.value); playing = false; });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') playing = !playing;
    if (e.code === 'ArrowRight') { t += e.shiftKey ? 1 : 1 / FPS; playing = false; }
    if (e.code === 'ArrowLeft') { t -= e.shiftKey ? 1 : 1 / FPS; playing = false; }
  });
  api.ready.then(() => {
    const loop = (now: number) => {
      if (playing) t += (now - last) / 1000;
      last = now;
      if (t >= DURATION) t = 0;
      if (t < 0) t = 0;
      film.render(t);
      bar.value = String(t); lab.textContent = `${t.toFixed(2)}s  f${Math.floor(t * FPS)}  ${errors.length ? 'ERR ' + errors[0] : ''}`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
