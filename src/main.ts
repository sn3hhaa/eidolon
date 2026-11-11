import * as THREE from 'three';
import { Film, FPS, DURATION, TOTAL_FRAMES, type Production } from './engine/film';

const q = new URLSearchParams(location.search);
const filmMode = q.has('film');
const scale = Number(q.get('scale') ?? (filmMode ? 1 : 0.5));
const blur = Number(q.get('blur') ?? (filmMode ? 6 : 1));
const W = Math.round(1920 * scale), H = Math.round(1080 * scale);

const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = W; canvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const errors: string[] = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason?.stack ?? e.reason)));

let film: Film | null = null, dbg = '';
const ready = (async () => {
  const mod = q.get('debug') ? await import(`./debug/${q.get('debug')}.ts`) : await import('./shots/production');
  const prod: Production & { debug?: string } = await mod.build(q);
  dbg = prod.debug ?? '';
  film = new Film(renderer, W, H, prod);
  return true;
})();
ready.catch((e) => errors.push(String(e?.stack ?? e)));

(window as any).__film = {
  fps: FPS, duration: DURATION, totalFrames: TOTAL_FRAMES, errors, ready,
  debug: () => dbg,
  gpu: () => { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'; },
  capture(t: number, type = 'image/png', quality = 0.92) { film!.render(t, blur); return canvas.toDataURL(type, quality); },
};

if (!filmMode) {
  const bar = document.getElementById('bar') as HTMLInputElement, lab = document.getElementById('lab')!;
  let t = Number(q.get('t') ?? 0), playing = !q.has('t'), last = performance.now();
  bar.addEventListener('input', () => { t = Number(bar.value); playing = false; });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') playing = !playing;
    if (e.code === 'ArrowRight') { t += e.shiftKey ? 1 : 1 / FPS; playing = false; }
    if (e.code === 'ArrowLeft') { t -= e.shiftKey ? 1 : 1 / FPS; playing = false; }
  });
  ready.then(() => {
    const loop = (now: number) => {
      if (playing) t += (now - last) / 1000; last = now;
      if (t >= DURATION) t = 0; if (t < 0) t = 0;
      film!.render(t, blur);
      bar.value = String(t); lab.textContent = `${t.toFixed(2)}s f${Math.floor(t * FPS)} ${film!.shotAt(t).name} ${errors[0] ?? ''}`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
