#!/usr/bin/env node
/**
 * FAST FORWARD offline renderer: drives the film in a headless GPU browser at exact
 * timestamps (frame n ↔ t = n / 30) and encodes with FFmpeg.
 *
 *   node scripts/render.mjs --stills 1,2.5,9.8 [--tag name] [--scale 0.5] [--blur 1] [--query debug=char]
 *   node scripts/render.mjs --out output/fast_forward_final.mp4 [--start s --end s] [--scale 1] [--blur 6]
 *   node scripts/render.mjs --encode-only --out output/fast_forward_final.mp4
 * Rendering is resumable: frames already in --frames-dir are kept unless --clean.
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = { scale: 1, crf: 16, out: 'output/fast_forward_final.mp4', framesDir: 'output/frames', dir: 'output/stills', tag: 'still', blur: undefined, query: '' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], next = () => argv[++i];
  if (k === '--start') a.start = Number(next());
  else if (k === '--end') a.end = Number(next());
  else if (k === '--scale') a.scale = Number(next());
  else if (k === '--blur') a.blur = Number(next());
  else if (k === '--out') a.out = next();
  else if (k === '--frames-dir') a.framesDir = next();
  else if (k === '--dir') a.dir = next();
  else if (k === '--tag') a.tag = next();
  else if (k === '--query') a.query = next();
  else if (k === '--crf') a.crf = Number(next());
  else if (k === '--clean') a.clean = true;
  else if (k === '--frames-only') a.framesOnly = true;
  else if (k === '--encode-only') a.encodeOnly = true;
  else if (k === '--headed') a.headed = true;
  else if (k === '--stills') a.stills = next().split(',').map(Number);
  else throw new Error(`Unknown option ${k}`);
}

const run = (cmd, args, capture = false) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  let out = '';
  if (capture) { child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (out += d)); }
  child.on('error', reject);
  child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}\n${out}`))));
});

const GPU_ARGS = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-webgl', '--force_high_performance_gpu',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--force-color-profile=srgb'];

async function open() {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5200 + Math.floor(Math.random() * 500), strictPort: false, hmr: false, watch: null } });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  let browser, lastErr;
  for (const channel of ['chrome', 'msedge', undefined]) {
    try { browser = await chromium.launch({ headless: !a.headed, channel, args: GPU_ARGS }); break; } catch (e) { lastErr = e; }
  }
  if (!browser) throw lastErr;
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(`${url}?film=1&scale=${a.scale}${a.blur !== undefined ? `&blur=${a.blur}` : ''}${a.query ? '&' + a.query : ''}`);
  await page.waitForFunction(() => window.__film !== undefined, null, { timeout: 120000 });
  const healthy = async () => {
    const errs = [...problems, ...(await page.evaluate(() => window.__film.errors))];
    if (errs.length) throw new Error(`Film reported errors:\n  ${[...new Set(errs)].slice(0, 12).join('\n  ')}`);
  };
  try { await page.evaluate(() => window.__film.ready); } catch (e) { problems.push(String(e)); }
  await healthy();
  const info = await page.evaluate(() => ({ fps: window.__film.fps, duration: window.__film.duration, total: window.__film.totalFrames, gpu: window.__film.gpu(), debug: window.__film.debug() }));
  const capture = async (t, file, type) => {
    const dataUrl = await page.evaluate(([tt, ty]) => window.__film.capture(tt, ty, 0.9), [t, type]);
    await writeFile(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  };
  return { info, capture, healthy, close: async () => { await browser.close(); await server.close(); } };
}

async function encode(fps) {
  const out = path.resolve(ROOT, a.out);
  await mkdir(path.dirname(out), { recursive: true });
  const dir = path.resolve(ROOT, a.framesDir);
  const frames = (await readdir(dir)).filter((f) => /^frame_\d{5}\.png$/.test(f)).sort();
  if (!frames.length) throw new Error(`No frames in ${dir}`);
  const first = Number(frames[0].slice(6, 11));
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(fps), '-start_number', String(first),
    '-i', path.join(dir, 'frame_%05d.png'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf), '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', '-an', out]);
  const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_read_frames,pix_fmt:format=duration,size', '-of', 'default=noprint_wrappers=1', out], true);
  console.log(`Encoded ${path.relative(ROOT, out)}\n${probe.trim()}`);
}

async function main() {
  if (a.encodeOnly) return encode(30);
  const film = await open();
  const { info } = film;
  console.log(`FAST FORWARD scale ${a.scale} · GPU: ${info.gpu}${info.debug ? '\n' + info.debug : ''}`);
  try {
    if (a.stills) {
      const dir = path.resolve(ROOT, a.dir);
      await mkdir(dir, { recursive: true });
      const t0 = Date.now();
      for (const t of a.stills) await film.capture(t, path.join(dir, `${a.tag}_${t.toFixed(2).padStart(6, '0')}.jpg`), 'image/jpeg');
      console.log(`${a.stills.length} stills in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      await film.healthy();
      return;
    }
    const first = Math.round((a.start ?? 0) * info.fps), last = Math.min(info.total, Math.round((a.end ?? info.duration) * info.fps));
    const dir = path.resolve(ROOT, a.framesDir);
    if (a.clean) await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const t0 = Date.now(); let done = 0, skipped = 0;
    for (let f = first; f < last; f++) {
      const file = path.join(dir, `frame_${String(f).padStart(5, '0')}.png`);
      try { await access(file); skipped++; continue; } catch {}
      await film.capture(f / info.fps, file, 'image/png');
      done++;
      if (done % 60 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        console.log(`  ${done + skipped}/${last - first} · ${rate.toFixed(2)} fps · ETA ${((last - first - done - skipped) / rate / 60).toFixed(1)} min`);
        await film.healthy();
      }
    }
    await film.healthy();
    console.log(`Rendered ${done} frames (${skipped} already present) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } finally { await film.close().catch(() => {}); }
  if (!a.framesOnly && !a.stills) await encode(info.fps);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
