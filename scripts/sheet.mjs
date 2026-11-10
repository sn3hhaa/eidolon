// usage: node scripts/sheet.mjs <tag> [cols] [tileWidth] → output/stills/<tag>_sheet.jpg from output/stills/<tag>_NN.NN.jpg
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const [tag, cols = '3', w = '640', dir = 'output/stills'] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.startsWith(tag + '_') && /\d\.jpg$/.test(f)).sort();
const rows = Math.ceil(files.length / Number(cols));
const args = ['-y', '-loglevel', 'error'];
files.forEach((f) => args.push('-i', `${dir}/${f}`));
const sc = files.map((_, i) => `[${i}:v]scale=${w}:-1[s${i}]`).join(';');
const lay = files.map((_, i) => `${(i % cols) * (Number(w) + 4)}_${Math.floor(i / cols) * (Math.round(Number(w) * 9 / 16) + 4)}`).join('|');
args.push('-filter_complex', `${sc};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${lay}:fill=black`, '-frames:v', '1', '-q:v', '3', `${dir}/${tag}_sheet.jpg`);
if (files.length === 1) { args.splice(args.indexOf('-filter_complex'), 2, '-vf', `scale=${w}:-1`); }
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
console.log(rows, 'rows', files.length, 'files', r.status);
