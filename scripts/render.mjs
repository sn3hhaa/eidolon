#!/usr/bin/env node
/**
 * EIDOLON offline renderer. Drives the film in a headless GPU browser and asks
 * for exact timestamps (frame n ↔ t = n / 30), then encodes with FFmpeg.
 *
 *   node scripts/render.mjs --stills 1,2.5,9.8 [--only s1,s2] [--scale 0.5] [--dir output/stills] [--tag name]
 *   node scripts/render.mjs --out output/eidolon_final.mp4 [--start s --end s] [--scale 1] [--step 1]
 *   node scripts/render.mjs --encode-only --out output/eidolon_final.mp4
 *
 * --step N renders every Nth frame (preview at 30/N fps source, encoded to 30 fps).
 * Rendering is resumable: existing frames in --frames-dir are kept unless --clean.
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = { scale: 1, crf: 16, out: 'output/eidolon_final.mp4', framesDir: 'output/frames', step: 1, dir: 'output/stills', tag: '' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], next = () => argv[++i];
  if (k === '--start') a.start = Number(next());
  else if (k === '--end') a.end = Number(next());
  else if (k === '--scale') a.scale = Number(next());
  else if (k === '--step') a.step = Number(next());
  else if (k === '--out') a.out = next();
  else if (k === '--frames-dir') a.framesDir = next();
  else if (k === '--dir') a.dir = next();
  else if (k === '--tag') a.tag = next();
  else if (k === '--only') a.only = next();
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

const GPU_ARGS = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-webgl',
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
  await page.goto(`${url}?film=1&scale=${a.scale}${a.only ? `&only=${a.only}` : ''}`);
  await page.waitForFunction(() => window.__eidolon !== undefined, null, { timeout: 120000 });
  await page.evaluate(() => window.__eidolon.ready);
  const info = await page.evaluate(() => ({ fps: window.__eidolon.fps, duration: window.__eidolon.duration, total: window.__eidolon.totalFrames, built: window.__eidolon.built(), gpu: window.__eidolon.gpu() }));
  const healthy = async () => {
    const errs = [...problems, ...(await page.evaluate(() => window.__eidolon.errors))];
    if (errs.length) throw new Error(`Film reported errors:\n  ${[...new Set(errs)].slice(0, 12).join('\n  ')}`);
  };
  const capture = async (t, file, type) => {
    const dataUrl = await page.evaluate(([tt, ty]) => window.__eidolon.capture(tt, ty, 0.9), [t, type]);
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
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(fps / a.step), '-start_number', String(first),
    '-i', path.join(dir, 'frame_%05d.png'), '-r', String(fps), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf), '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out]);
  const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_read_frames,pix_fmt:format=duration,size', '-of', 'default=noprint_wrappers=1', out], true);
  console.log(`Encoded ${path.relative(ROOT, out)}\n${probe.trim()}`);
}

async function main() {
  if (a.encodeOnly) return encode(30);
  const film = await open();
  const { info } = film;
  console.log(`EIDOLON scale ${a.scale} · GPU: ${info.gpu} · built: ${info.built.join(',')}`);
  try {
    await film.healthy();
    if (a.stills) {
      const dir = path.resolve(ROOT, a.dir);
      await mkdir(dir, { recursive: true });
      for (const t of a.stills) {
        const file = path.join(dir, `${a.tag ? a.tag + '_' : ''}${t.toFixed(2).padStart(5, '0')}.jpg`);
        const t0 = Date.now();
        await film.capture(t, file, 'image/jpeg');
        console.log(`  ${path.relative(ROOT, file)}  (${Date.now() - t0} ms)`);
      }
      await film.healthy();
      return;
    }
    const first = Math.round((a.start ?? 0) * info.fps), last = Math.min(info.total, Math.round((a.end ?? info.duration) * info.fps));
    const dir = path.resolve(ROOT, a.framesDir);
    if (a.clean) await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const t0 = Date.now(); let done = 0, skipped = 0;
    const count = Math.ceil((last - first) / a.step);
    for (let f = first, n = 0; f < last; f += a.step, n++) {
      const idx = a.step === 1 ? f : n;
      const file = path.join(dir, `frame_${String(idx).padStart(5, '0')}.png`);
      try { await access(file); skipped++; continue; } catch {}
      await film.capture(f / info.fps, file, 'image/png');
      done++;
      if (done % 30 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        console.log(`  ${done + skipped}/${count} · ${rate.toFixed(2)} fps · ETA ${((count - done - skipped) / rate / 60).toFixed(1)} min`);
        await film.healthy();
      }
    }
    await film.healthy();
    console.log(`Rendered ${done} frames (${skipped} already present) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } finally { await film.close().catch(() => {}); }
  if (!a.framesOnly && !a.stills) await encode(info.fps);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
