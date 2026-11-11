/** One shared atlas for every painted shop sign (invented names only). */
import * as THREE from 'three';
import { toon } from '../../engine/look';
import { INK, type Rnd } from './paint';

export const SHOP_NAMES: [string, string][] = [
  ['MARLO BAKERY', 'bakery'], ['KITE & KETTLE', 'cafe'], ['SUNDAY RECORDS', 'shelves'], ['NOON CAFÉ', 'cafe'], ['LUMEN BOOKS', 'shelves'], ['TIDEWATER CYCLES', 'shelves'],
  ['GOLDFINCH GROCER', 'shelves'], ['FIG & FERN', 'plants'], ['OLLIE’S LAUNDRY', 'washers'], ['PICO PICO', 'clothes'], ['SALTLINE SURF', 'clothes'], ['HOSHI NOODLE', 'cafe'],
  ['BLUEBIRD PHARMACY', 'shelves'], ['MANGO MANGO', 'cafe'], ['CEDAR HARDWARE', 'shelves'], ['LITTLE LANTERN TEA', 'cafe'], ['ORBIT ARCADE', 'shelves'], ['VELVET SCISSORS', 'clothes'],
  ['HARBOR POST', 'shelves'], ['GOOD EGG DINER', 'cafe'], ['TANGO TAILOR', 'clothes'], ['PANDA PRINT', 'shelves'], ['SEAGLASS OPTICAL', 'shelves'], ['MOSS FLORIST', 'plants'],
  ['CLOUD NINE SWEETS', 'bakery'], ['HALF PAST VINYL', 'shelves'], ['PEPPER POT', 'cafe'], ['KUMO CAMERA', 'shelves'], ['WREN & CO.', 'clothes'], ['PIER 9 FISH', 'shelves'],
  ['DAISY CHAIN', 'plants'], ['SODA POP', 'cafe'], ['NIMBUS TOYS', 'shelves'], ['QUILL STATIONERY', 'shelves'], ['BREAD ALONE', 'bakery'], ['SUDS & BUBBLES', 'washers'],
  ['LOW TIDE THRIFT', 'clothes'], ['OKA GELATO', 'cafe'], ['PLUM ST. MARKET', 'shelves'], ['FERNWEH TRAVEL', 'shelves'], ['TWO WHEELS', 'shelves'], ['MIRA FLORA', 'plants'],
  ['ATLAS MAPS', 'shelves'], ['COPPER KETTLE', 'cafe'], ['BON BON', 'bakery'], ['STUDIO KOI', 'clothes'], ['ZEST JUICE', 'cafe'], ['THE GREEN DOOR', 'plants'],
  ['HOTEL MIRAMAR', 'cafe'], ['CAFÉ AZUL', 'cafe'], ['GULL & ANCHOR', 'cafe'], ['LA ONDA', 'cafe'], ['SEA BREEZE INN', 'cafe'], ['BOARDWALK BITES', 'cafe'],
];
const FONTS = ['900 78px "Arial Black", Impact, sans-serif', 'italic 700 80px Georgia, serif', '700 76px "Trebuchet MS", sans-serif', '700 74px "Courier New", monospace', '700 84px Impact, "Arial Narrow", sans-serif', '600 76px Georgia, serif'];
const COLS = 4, ROWS = 40, SW = 512, SH = 128;

export class SignAtlas {
  canvas = document.createElement('canvas'); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mat: THREE.Material; n = 0;
  constructor() {
    this.canvas.width = COLS * SW; this.canvas.height = ROWS * SH; this.g = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mat = toon('#ffffff', { map: this.tex });
  }
  /** Paint a sign; returns its uv rect [u0,v0,u1,v1]. */
  slot(text: string, bg: string, fg: string, R: Rnd): [number, number, number, number] {
    const i = this.n++ % (COLS * ROWS), x = (i % COLS) * SW, y = Math.floor(i / COLS) * SH, g = this.g;
    g.save(); g.beginPath(); g.rect(x, y, SW, SH); g.clip();
    g.fillStyle = bg; g.fillRect(x, y, SW, SH);
    for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#000000'; g.globalAlpha = 0.05; g.beginPath(); g.ellipse(x + R() * SW, y + R() * SH, R.range(30, 110), R.range(8, 26), 0, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(x + 10, y + 10, SW - 20, SH - 20);
    g.font = R.pick(FONTS); g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width, s = Math.min(1, (SW - 60) / w);
    g.translate(x + SW / 2, y + SH / 2 + 4); g.scale(s, Math.max(s, 0.72));
    g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 7; g.globalAlpha = 0.55; g.strokeText(text, 2, 3); g.globalAlpha = 1;
    g.fillStyle = fg; g.fillText(text, 0, 0);
    g.restore(); this.tex.needsUpdate = true;
    const e = 2 / (COLS * SW), f = 2 / (ROWS * SH);
    return [x / (COLS * SW) + e, 1 - (y + SH) / (ROWS * SH) + f, (x + SW) / (COLS * SW) - e, 1 - y / (ROWS * SH) - f];
  }
}
