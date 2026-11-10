#!/usr/bin/env node
/**
 * Smoke test: exercises the dev transport and checks determinism in a real
 * browser. Exits non-zero on the first failed check.
 *
 *   node scripts/smoke.mjs [--channel msedge] [--shot output/dev-ui.png]
 */
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const channelArg = opt('--channel');
const shot = path.resolve(ROOT, opt('--shot', 'output/dev-ui.png'));

const GPU_ARGS = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-webgl'];

async function launch() {
  let lastErr;
  for (const channel of channelArg ? [channelArg] : ['chromium', 'msedge', 'chrome']) {
    try {
      return await chromium.launch({ headless: true, channel: channel === 'chromium' ? undefined : channel, args: GPU_ARGS });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5198, strictPort: false, hmr: false, watch: null } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await launch();

try {
  // ---------- dev mode: transport ----------
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(`${url}?t=6.2`);
  await page.waitForFunction(() => window.__eidolon !== undefined);
  await page.evaluate(() => window.__eidolon.ready);

  const readout = () => page.locator('#dev .readout').innerText();
  const frameOf = async () => Number((await readout()).match(/f(\d+)\//)[1]);

  check('dev UI is present', (await page.locator('#dev button').count()) >= 4);
  check('?t=6.2 opens on frame 186', (await frameOf()) === 186, `frame ${await frameOf()}`);

  await page.keyboard.press('ArrowRight');
  check('→ steps one frame', (await frameOf()) === 187);
  await page.keyboard.press('Shift+ArrowLeft');
  check('Shift+← steps back ten frames', (await frameOf()) === 177);

  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  await page.keyboard.press('Space');
  const afterPlay = await frameOf();
  check('Space plays, then pauses', afterPlay > 185, `advanced to frame ${afterPlay}`);
  await page.waitForTimeout(400);
  check('paused playhead holds still', (await frameOf()) === afterPlay);

  await page.locator('#dev select').first().selectOption('4');
  check('scene menu jumps to scene 05 (frame 1200)', (await frameOf()) === 1200);
  check('unbuilt scene is labelled', (await readout()).includes('scene not built'));

  await page.keyboard.press('Digit1');
  check('key 1 jumps to scene 01', (await frameOf()) === 0);

  await page.locator('#dev input[type=range]').evaluate((el) => {
    el.value = '159';
    el.dispatchEvent(new Event('input'));
  });
  check('scrubber seeks', (await frameOf()) === 159);

  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('KeyS')]);
  check('S saves a PNG screenshot', /^eidolon_f00159_\d+p\.png$/.test(download.suggestedFilename()), download.suggestedFilename());

  await page.locator('#dev select').nth(1).selectOption('1');
  const size = await page.evaluate(() => window.__eidolon.size());
  check('resolution menu switches to 1080p', size.width === 1920 && size.height === 1080, `${size.width}x${size.height}`);

  await page.locator('#dev input[type=range]').evaluate((el) => {
    el.value = '186';
    el.dispatchEvent(new Event('input'));
  });
  await mkdir(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot });
  check('no console/page errors in dev mode', problems.length === 0, problems.join(' | '));
  await page.close();

  // ---------- film mode: clean canvas + determinism ----------
  const film = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await film.goto(`${url}?film=1&scale=0.5`);
  await film.waitForFunction(() => window.__eidolon !== undefined);
  await film.evaluate(() => window.__eidolon.ready);
  check('film mode has no visible controls', !(await film.locator('#dev').isVisible()));
  check('film mode creates no control elements', (await film.locator('#dev *').count()) === 0);

  const hash = async (f) => createHash('sha256').update(await film.evaluate((n) => window.__eidolon.captureFrame(n), f)).digest('hex');
  const frames = [45, 159, 186, 270, 298];
  const first = {};
  for (const f of frames) first[f] = await hash(f);
  // revisit in a different order, after unrelated frames
  let same = true;
  for (const f of [298, 45, 270, 186, 159]) {
    await hash((f * 7 + 13) % 300);
    if ((await hash(f)) !== first[f]) same = false;
  }
  check('frames are identical regardless of render order', same, `${frames.length} frames re-rendered out of order`);
  check('different frames differ', new Set(Object.values(first)).size === frames.length);
  await film.close();
} finally {
  await browser.close();
  await server.close();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
