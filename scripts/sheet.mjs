// Tile stills into one review sheet: node scripts/sheet.mjs <tag> [cols] [tileWidth] [dir] → <dir>/<tag>_sheet.jpg
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const [tag, cols = '3', w = '640', dir = 'output/stills'] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.startsWith(tag + '_') && /\d\.jpg$/.test(f)).sort();
const args = ['-y', '-loglevel', 'error'];
files.forEach((f) => args.push('-i', `${dir}/${f}`));
const th = Math.round((Number(w) * 9) / 16);
if (files.length === 1) args.push('-vf', `scale=${w}:${th}`);
else {
  const sc = files.map((_, i) => `[${i}:v]scale=${w}:${th}[s${i}]`).join(';');
  const lay = files.map((_, i) => `${(i % cols) * (Number(w) + 4)}_${Math.floor(i / cols) * (th + 4)}`).join('|');
  args.push('-filter_complex', `${sc};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${lay}:fill=black`);
}
args.push('-frames:v', '1', '-q:v', '3', `${dir}/${tag}_sheet.jpg`);
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
console.log(files.length, 'files →', `${dir}/${tag}_sheet.jpg`, r.status);
