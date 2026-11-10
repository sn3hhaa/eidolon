import { DevUI } from './dev/DevUI';
import { Film } from './engine/Film';
import { FILM } from './film';

/**
 * URL parameters
 *   ?film=1     film mode: bare canvas at exact render resolution, no dev UI
 *   &scale=0.5  internal resolution scale (default 1 in film mode, 0.5 in dev)
 *   &t=4.2      initial time in seconds (dev mode)
 */
const params = new URLSearchParams(location.search);
const filmMode = params.has('film');
const scale = Number(params.get('scale') ?? (filmMode ? 1 : 0.5));
const startTime = Number(params.get('t') ?? 0);

const canvas = document.getElementById('film') as HTMLCanvasElement;
const film = new Film(canvas, FILM, scale);

const errors: string[] = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
canvas.addEventListener('webglcontextlost', () => errors.push('WebGL context lost'));

const ready = film.init().then(() => {
  if (filmMode) {
    document.body.classList.add('film-mode');
    film.renderFrame(0);
  } else {
    new DevUI(film, document.getElementById('dev')!, startTime);
  }
  return true;
});

/** Automation API used by scripts/render.mjs (Playwright). */
const api = {
  ready,
  errors,
  fps: film.fps,
  duration: film.duration,
  totalFrames: film.totalFrames,
  size: () => ({ width: film.width, height: film.height }),
  scenes: () => film.segments.map((s) => ({ id: s.id, title: s.title, start: s.start, end: s.end, built: s.scene.built })),
  gpu: () => {
    const gl = film.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  },
  renderFrame: (frame: number) => film.renderFrame(frame),
  /** Render frame n and return it as a data URL (PNG by default). */
  captureFrame: (frame: number, mime = 'image/png', quality?: number) => {
    film.renderFrame(frame);
    return canvas.toDataURL(mime, quality);
  },
};

declare global {
  interface Window {
    __eidolon: typeof api;
  }
}
window.__eidolon = api;
