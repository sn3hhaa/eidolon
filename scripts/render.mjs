#!/usr/bin/env node
/**
 * EIDOLON offline renderer.
 *
 * Drives the film in a headless browser (Playwright), asking it to draw exact
 * frame numbers and saving each as a PNG, then assembles the sequence with
 * FFmpeg. Nothing here depends on real time: frame n is always t = n / fps.
 *
 *   node scripts/render.mjs [options]
 *
 *   --start <sec>       first second to render            (default 0)
 *   --end <sec>         last second (exclusive)           (default: film duration)
 *   --scene <1-9>       render just one scene's time range
 *   --scale <f>         resolution scale, 1 = 1920x1080   (default 1)
 *   --out <file.mp4>    output video                      (default output/eidolon.mp4)
 *   --frames-dir <dir>  frame sequence directory          (default output/frames)
 *   --frames-only       render the PNG sequence, skip encoding
 *   --encode-only       encode an existing sequence, skip rendering
 *   --stills [a,b,c]    save single frames at these seconds to output/stills
 *                       (default: a spread across the built scenes), no video
 *   --crf <n>           x264 quality, lower = better      (default 17)
 *   --channel <name>    browser: chromium | msedge | chrome (default: auto)
 *   --headed            show the browser window
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const a = { scale: 1, crf: 17, out: 'output/eidolon.mp4', framesDir: 'output/frames' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === '--start') a.start = Number(next());
    else if (k === '--end') a.end = Number(next());
    else if (k === '--scene') a.scene = Number(next());
    else if (k === '--scale') a.scale = Number(next());
    else if (k === '--out') a.out = next();
    else if (k === '--frames-dir') a.framesDir = next();
    else if (k === '--frames-only') a.framesOnly = true;
    else if (k === '--encode-only') a.encodeOnly = true;
    else if (k === '--crf') a.crf = Number(next());
    else if (k === '--channel') a.channel = next();
    else if (k === '--headed') a.headed = true;
    else if (k === '--stills') {
      a.stills = argv[i + 1] && !argv[i + 1].startsWith('--') ? next().split(',').map(Number) : [];
    } else throw new Error(`Unknown option ${k}`);
  }
  return a;
}

function run(cmd, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let out = '';
    if (capture) {
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (out += d));
    }
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited with ${code}\n${out}`))));
  });
}

const GPU_ARGS = [
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--use-angle=d3d11',
  '--enable-webgl',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--force-color-profile=srgb',
];

async function launch(args) {
  const tries = args.channel ? [args.channel] : ['chromium', 'msedge', 'chrome'];
  let lastErr;
  for (const channel of tries) {
    try {
      const browser = await chromium.launch({
        headless: !args.headed,
        channel: channel === 'chromium' ? undefined : channel,
        args: GPU_ARGS,
      });
      return { browser, channel };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Could not launch a browser (tried ${tries.join(', ')}). Run "npx playwright install chromium" ` +
      `or pass --channel msedge.\n${lastErr}`,
  );
}

async function openFilm(args) {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false, hmr: false, watch: null } });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  const { browser, channel } = await launch(args);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(String(e)));

  await page.goto(`${url}?film=1&scale=${args.scale}`);
  await page.waitForFunction(() => window.__eidolon !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => window.__eidolon.ready);
  const info = await page.evaluate(() => ({
    fps: window.__eidolon.fps,
    duration: window.__eidolon.duration,
    totalFrames: window.__eidolon.totalFrames,
    size: window.__eidolon.size(),
    scenes: window.__eidolon.scenes(),
    gpu: window.__eidolon.gpu(),
  }));

  const assertHealthy = async () => {
    const pageErrors = await page.evaluate(() => window.__eidolon.errors);
    const all = [...problems, ...pageErrors];
    if (all.length) throw new Error(`The film reported errors — aborting so no broken frames are written:\n  ${all.join('\n  ')}`);
  };
  const capture = async (frame, file) => {
    const dataUrl = await page.evaluate((f) => window.__eidolon.captureFrame(f), frame);
    await writeFile(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  };
  const close = async () => {
    await browser.close();
    await server.close();
  };
  return { info, channel, capture, assertHealthy, close };
}

const frameName = (n) => `frame_${String(n).padStart(5, '0')}.png`;

async function encode(args, fps, firstFrame, count) {
  const out = path.resolve(ROOT, args.out);
  await mkdir(path.dirname(out), { recursive: true });
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-framerate', String(fps),
    '-start_number', String(firstFrame),
    '-i', path.join(path.resolve(ROOT, args.framesDir), 'frame_%05d.png'),
    '-frames:v', String(count),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf),
    '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart',
    out,
  ]);
  const probe = await run(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
     '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_read_frames,pix_fmt:format=duration,size',
     '-of', 'default=noprint_wrappers=1', out],
    { capture: true },
  );
  console.log(`\nEncoded ${path.relative(ROOT, out)}\n${probe.trim()}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.encodeOnly) {
    const dir = path.resolve(ROOT, args.framesDir);
    const frames = (await readdir(dir)).filter((f) => /^frame_\d{5}\.png$/.test(f)).sort();
    if (!frames.length) throw new Error(`No frames found in ${dir}`);
    const first = Number(frames[0].slice(6, 11));
    await encode(args, 30, first, frames.length);
    return;
  }

  const film = await openFilm(args);
  const { info } = film;
  console.log(
    `EIDOLON · ${info.size.width}x${info.size.height} @ ${info.fps} fps · ${info.totalFrames} frames · ` +
      `browser: ${film.channel} · GPU: ${info.gpu}`,
  );
  const unbuilt = info.scenes.filter((s) => !s.built);
  if (unbuilt.length) {
    console.log(`NOTE: ${unbuilt.length} scene(s) are not built yet and will render black: ${unbuilt.map((s) => s.id).join(', ')}`);
  }

  try {
    await film.assertHealthy();

    if (args.stills) {
      const dir = path.resolve(ROOT, 'output/stills');
      await mkdir(dir, { recursive: true });
      let times = args.stills;
      if (!times.length) {
        times = info.scenes.filter((s) => s.built).flatMap((s) => [0.1, 0.3, 0.5, 0.7, 0.9].map((k) => s.start + (s.end - s.start) * k));
      }
      for (const t of times) {
        const frame = Math.min(info.totalFrames - 1, Math.max(0, Math.floor(t * info.fps + 1e-6)));
        const file = path.join(dir, `still_${String(frame).padStart(5, '0')}_${t.toFixed(2)}s.png`);
        await film.capture(frame, file);
        console.log(`  ${path.relative(ROOT, file)}`);
      }
      await film.assertHealthy();
      return;
    }

    let start = args.start ?? 0;
    let end = args.end ?? info.duration;
    if (args.scene) {
      const s = info.scenes[args.scene - 1];
      if (!s) throw new Error(`No scene ${args.scene}`);
      start = s.start;
      end = s.end;
    }
    const first = Math.round(start * info.fps);
    const last = Math.min(info.totalFrames, Math.round(end * info.fps)); // exclusive
    const count = last - first;
    const dir = path.resolve(ROOT, args.framesDir);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    console.log(`Rendering frames ${first}–${last - 1} (${count} frames, ${start}s–${end}s) → ${path.relative(ROOT, dir)}`);
    const t0 = Date.now();
    for (let f = first; f < last; f++) {
      await film.capture(f, path.join(dir, frameName(f)));
      const done = f - first + 1;
      if (done % 30 === 0 || done === count) {
        const el = (Date.now() - t0) / 1000;
        const rate = done / el;
        process.stdout.write(`\r  ${done}/${count} frames · ${rate.toFixed(2)} fps · ETA ${((count - done) / rate).toFixed(0)}s   `);
        await film.assertHealthy();
      }
    }
    console.log(`\nRendered ${count} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await film.close();
    if (!args.framesOnly) await encode(args, info.fps, first, count);
    return;
  } finally {
    await film.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(`\n${err.message ?? err}`);
  process.exit(1);
});
