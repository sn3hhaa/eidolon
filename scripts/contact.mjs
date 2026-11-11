#!/usr/bin/env node
// Contact sheets from a rendered video.
//   node scripts/contact.mjs                      → output/no_signal_contact_sheet.jpg (one frame per shot of the final film)
//   node scripts/contact.mjs strip <mp4> <t0> <t1> <n> [cols] [tileWidth] [out]   → evenly spaced frames of a time range (motion review)
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const CUTS = [0, 2.1, 3.8, 5.9, 7.9, 10, 11.5, 14.3, 16.2, 17.6, 20.4, 22.6, 25, 27.4, 30.6, 32.6, 35, 37.3, 38.6, 40.6, 42.8, 44.6, 47.4, 50, 52.3, 54, 55.4, 56.6, 58.4, 59.8, 62.4, 65, 66.6, 72, 74.2, 76.4, 79.6, 81.6, 83.3, 84.7, 86, 88, 90];
const [mode, ...rest] = process.argv.slice(2);
let src = 'output/no_signal_final.mp4', times = CUTS.slice(0, -1).map((t, i) => (i === 6 ? 13.05 : i === 32 ? 69.4 : (t + CUTS[i + 1]) / 2)), cols = 7, w = 480, out = 'output/no_signal_contact_sheet.jpg';
if (mode === 'strip') { src = rest[0]; const t0 = Number(rest[1]), t1 = Number(rest[2]), n = Number(rest[3]); times = Array.from({ length: n }, (_, i) => t0 + ((t1 - t0) * i) / Math.max(1, n - 1)); cols = Number(rest[4] ?? 6); w = Number(rest[5] ?? 320); out = rest[6] ?? 'output/stills/strip.jpg'; }
else if (mode) src = mode;
const tmp = 'output/.contact'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const h = Math.round((w * 9) / 16), files = [];
times.forEach((t, i) => { const f = `${tmp}/${String(i).padStart(3, '0')}.jpg`; const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', src, '-frames:v', '1', '-vf', `scale=${w}:${h}`, '-q:v', '3', f]); if (r.status === 0) files.push(f); });
const args = ['-y', '-loglevel', 'error']; files.forEach((f) => args.push('-i', f));
const lay = files.map((_, i) => `${(i % cols) * (w + 4)}_${Math.floor(i / cols) * (h + 4)}`).join('|');
args.push('-filter_complex', `${files.map((_, i) => `[${i}:v]`).join('')}xstack=inputs=${files.length}:layout=${lay}:fill=black`, '-frames:v', '1', '-q:v', '3', out);
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' }); rmSync(tmp, { recursive: true, force: true });
console.log(`${files.length} frames → ${out}`, r.status);
