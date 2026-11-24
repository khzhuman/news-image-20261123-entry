// THE WORLD IN ONE DAY — Monday 23 November 2026.
// A one-page newspaper rendered from a pre-baked glyph atlas: letterforms
// are blitted as real raster bitmaps (never drawn as outlines), scenes are
// painted as flat silhouettes on a 2x buffer and box-downsampled, and the
// finished page is encoded as a PNG with only the Node standard library.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEADS,
  CARDS,
  UTC_COLUMNS,
  BRIEFS,
  DATE_CHECK_LEFT,
  DATE_CHECK_RIGHT,
  NOT_YET_TEXT,
  LEGEND_LINES,
  REGION_RGB,
  BAR_SEGMENTS,
  type StoryCard,
} from "./data.ts";

type RGB = [number, number, number];

const PAGE_W = 1024;
const PAGE_H = 1024;

const PAPER: RGB = [247, 242, 231];
const CARD_BG: RGB = [255, 253, 246];
const STRIP_BG: RGB = [239, 233, 216];
const FRAME_LINE: RGB = [198, 188, 164];
const INK: RGB = [26, 23, 19];
const FAINT: RGB = [168, 158, 144];
const TAG_GREEN: RGB = [24, 96, 56];
const CREAM: RGB = [255, 244, 214];
const WHITE: RGB = [255, 255, 255];
const ALERT_RED: RGB = [166, 44, 30];
const LEAD_BRIEF_INK: RGB = [73, 68, 60];
const BODY_GRAY: RGB = [73, 68, 60];
const CARD_BRIEF_INK: RGB = [124, 118, 110];

// ---------------------------------------------------------------- atlas ---
// atlas.dat: [4-byte BE header length][header JSON][zlib grayscale pixels]
// glyph entry: [x, y, w, h, dx, dy, advance]; dx/dy place the ink's top-left
// relative to the pen origin (pen x, baseline y).

interface GlyphSet {
  ascent: number;
  descent: number;
  glyphs: Record<string, number[]>;
}

const here = dirname(fileURLToPath(import.meta.url));
const atlasFile = readFileSync(join(here, "atlas.dat"));
const headLen = atlasFile.readUInt32BE(0);
const atlasHead = JSON.parse(atlasFile.subarray(4, 4 + headLen).toString("utf8"));
const ATLAS_W: number = atlasHead.width;
const atlasBits: Buffer = inflateSync(atlasFile.subarray(4 + headLen));
const FONT: Record<string, GlyphSet> = atlasHead.styles;

// ---------------------------------------------------------------- frame ---
const frame = new Uint8Array(PAGE_W * PAGE_H * 3);

function paintPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= PAGE_W || y >= PAGE_H) return;
  const i = (y * PAGE_W + x) * 3;
  frame[i] = c[0];
  frame[i + 1] = c[1];
  frame[i + 2] = c[2];
}

function blendPixel(x: number, y: number, c: RGB, a: number): void {
  if (x < 0 || y < 0 || x >= PAGE_W || y >= PAGE_H || a <= 0) return;
  const i = (y * PAGE_W + x) * 3;
  const keep = 255 - a;
  frame[i] = Math.round((c[0] * a + frame[i] * keep) / 255);
  frame[i + 1] = Math.round((c[1] * a + frame[i + 1] * keep) / 255);
  frame[i + 2] = Math.round((c[2] * a + frame[i + 2] * keep) / 255);
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) paintPixel(xx, yy, c);
}

function strokeRect(x: number, y: number, w: number, h: number, c: RGB): void {
  fillRect(x, y, w, 1, c);
  fillRect(x, y + h - 1, w, 1, c);
  fillRect(x, y, 1, h, c);
  fillRect(x + w - 1, y, 1, h, c);
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = Math.floor(cy - r); yy <= cy + r; yy++)
    for (let xx = Math.floor(cx - r); xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) paintPixel(xx, yy, c);
    }
}

// ----------------------------------------------------------------- text ---
function glyphOf(style: string, ch: string): number[] {
  const set = FONT[style].glyphs;
  return set[ch] ?? set["?"] ?? [0, 0, 0, 0, 0, 0, 0];
}

function textWidth(style: string, s: string, tracking = 0): number {
  let w = 0;
  for (const ch of s) w += glyphOf(style, ch)[6];
  return s.length > 1 ? w + tracking * (s.length - 1) : w;
}

// Draws one line with the pen starting at x on the given baseline; returns
// the pen x at the end of the line.
function drawLine(
  style: string,
  s: string,
  x: number,
  baseline: number,
  c: RGB,
  tracking = 0,
): number {
  let pen = x;
  for (const ch of s) {
    const g = glyphOf(style, ch);
    const [gx, gy, gw, gh, dx, dy, adv] = g;
    if (gw > 0 && gh > 0) {
      const left = Math.round(pen) + dx;
      const top = baseline + dy;
      for (let row = 0; row < gh; row++) {
        const src = (gy + row) * ATLAS_W + gx;
        for (let col = 0; col < gw; col++) {
          const a = atlasBits[src + col];
          if (a > 0) blendPixel(left + col, top + row, c, a);
        }
      }
    }
    pen += adv + tracking;
  }
  return pen;
}

function drawLineRight(
  style: string,
  s: string,
  right: number,
  baseline: number,
  c: RGB,
  tracking = 0,
): void {
  drawLine(style, s, right - textWidth(style, s, tracking), baseline, c, tracking);
}

// One line drawn with its glyphs compressed horizontally by `squash`
// (bitmap columns resampled); used where a line must fit a fixed measure.
function drawLineSquash(
  style: string,
  s: string,
  x: number,
  baseline: number,
  c: RGB,
  squash: number,
): number {
  let pen = x;
  for (const ch of s) {
    const g = glyphOf(style, ch);
    const [gx, gy, gw, gh, dx, dy, adv] = g;
    if (gw > 0 && gh > 0) {
      const left = Math.round(pen + dx * squash);
      const top = baseline + dy;
      const destW = Math.max(1, Math.round(gw * squash));
      for (let col = 0; col < destW; col++) {
        const srcCol = Math.min(gw - 1, Math.floor(col / squash));
        for (let row = 0; row < gh; row++) {
          const a = atlasBits[(gy + row) * ATLAS_W + gx + srcCol];
          if (a > 0) blendPixel(left + col, top + row, c, a);
        }
      }
    }
    pen += adv * squash;
  }
  return pen;
}

function drawLineCentered(
  style: string,
  s: string,
  cx: number,
  baseline: number,
  c: RGB,
  tracking = 0,
): void {
  drawLine(style, s, cx - textWidth(style, s, tracking) / 2, baseline, c, tracking);
}

// Greedy word wrap on atlas advances.
function wrap(style: string, s: string, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (cur !== "" && textWidth(style, trial) > maxW) {
      lines.push(cur);
      cur = word;
    } else {
      cur = trial;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// --------------------------------------------------------------- scenes ---
// A scene is painted at SS times its final size, then averaged down in
// 2x2 blocks (box filter), which is what softens the silhouette edges.
const SS = 2;

class Scene {
  w: number;
  h: number;
  pix: Uint8Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.pix = new Uint8Array(w * SS * h * SS * 3);
  }
  private put(x: number, y: number, c: RGB): void {
    const W = this.w * SS;
    if (x < 0 || y < 0 || x >= W || y >= this.h * SS) return;
    const i = (y * W + x) * 3;
    this.pix[i] = c[0];
    this.pix[i + 1] = c[1];
    this.pix[i + 2] = c[2];
  }
  fill(c: RGB): void {
    for (let i = 0; i < this.pix.length; i += 3) {
      this.pix[i] = c[0];
      this.pix[i + 1] = c[1];
      this.pix[i + 2] = c[2];
    }
  }
  // vertical two-stop gradient, top colour to bottom colour
  gradient(top: RGB, bottom: RGB): void {
    const H = this.h * SS;
    for (let y = 0; y < H; y++) {
      const t = H <= 1 ? 0 : y / (H - 1);
      const c: RGB = [
        Math.round(top[0] + (bottom[0] - top[0]) * t),
        Math.round(top[1] + (bottom[1] - top[1]) * t),
        Math.round(top[2] + (bottom[2] - top[2]) * t),
      ];
      for (let x = 0; x < this.w * SS; x++) this.put(x, y, c);
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = Math.round(y * SS); yy < Math.round((y + h) * SS); yy++)
      for (let xx = Math.round(x * SS); xx < Math.round((x + w) * SS); xx++)
        this.put(xx, yy, c);
  }
  poly(pts: [number, number][], c: RGB): void {
    const P = pts.map(([x, y]): [number, number] => [x * SS, y * SS]);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of P) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < P.length; i++) {
        const [x1, y1] = P[i];
        const [x2, y2] = P[(i + 1) % P.length];
        if ((y >= y1 && y < y2) || (y >= y2 && y < y1)) {
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++)
          this.put(x, y, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    const CX = cx * SS;
    const CY = cy * SS;
    const R = r * SS;
    for (let y = Math.floor(CY - R); y <= CY + R; y++)
      for (let x = Math.floor(CX - R); x <= CX + R; x++) {
        const dx = x - CX;
        const dy = y - CY;
        if (dx * dx + dy * dy <= R * R) this.put(x, y, c);
      }
  }
  ring(cx: number, cy: number, r: number, width: number, c: RGB): void {
    const CX = cx * SS;
    const CY = cy * SS;
    const R = r * SS;
    const inner = (r - width) * SS;
    for (let y = Math.floor(CY - R); y <= CY + R; y++)
      for (let x = Math.floor(CX - R); x <= CX + R; x++) {
        const d2 = (x - CX) * (x - CX) + (y - CY) * (y - CY);
        if (d2 <= R * R && d2 >= inner * inner) this.put(x, y, c);
      }
  }
  line(x1: number, y1: number, x2: number, y2: number, width: number, c: RGB): void {
    const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * SS));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, c);
    }
  }
  pasteTo(ox: number, oy: number): void {
    const W = this.w * SS;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let dy = 0; dy < SS; dy++) {
          for (let dx = 0; dx < SS; dx++) {
            const i = ((y * SS + dy) * W + (x * SS + dx)) * 3;
            r += this.pix[i];
            g += this.pix[i + 1];
            b += this.pix[i + 2];
          }
        }
        const n = SS * SS;
        paintPixel(ox + x, oy + y, [
          Math.round(r / n),
          Math.round(g / n),
          Math.round(b / n),
        ]);
      }
    }
  }
}

// ------------------------------------------------------------------ PNG ---
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(kind: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(): Buffer {
  const stride = PAGE_W * 3;
  const raw = Buffer.alloc((stride + 1) * PAGE_H);
  const prev = new Int16Array(stride);
  for (let y = 0; y < PAGE_H; y++) {
    const rowOff = y * (stride + 1);
    const srcOff = y * stride;
    // score each filter by total absolute residual, keep the best row
    let bestFilter = 0;
    let bestScore = Infinity;
    let bestRow: Buffer | null = null;
    for (let f = 0; f <= 4; f++) {
      const cand = Buffer.alloc(stride);
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 3 ? frame[srcOff + i - 3] : 0;
        const b = y > 0 ? frame[srcOff - stride + i] : 0;
        const cc = y > 0 && i >= 3 ? frame[srcOff - stride + i - 3] : 0;
        let pred = 0;
        if (f === 1) pred = a;
        else if (f === 2) pred = b;
        else if (f === 3) pred = (a + b) >> 1;
        else if (f === 4) {
          const p = a + b - cc;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - cc);
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : cc;
        }
        const v = (frame[srcOff + i] - pred) & 0xff;
        cand[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestFilter = f;
        bestRow = cand;
      }
    }
    raw[rowOff] = bestFilter;
    (bestRow as Buffer).copy(raw, rowOff + 1);
    void prev;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PAGE_W, 0);
  ihdr.writeUInt32BE(PAGE_H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------- scenes ---
// Each painter receives a fresh scene buffer sized to its card window and
// draws one flat duotone silhouette that pictures the story.

type Painter = (sc: Scene) => void;

const SCENES: Record<string, Painter> = {
  // Nvidia: a microchip with pins and a pale display, gavel at the foot.
  chip(sc) {
    sc.fill([9, 17, 28]);
    const pin: RGB = [198, 188, 164];
    sc.rect(100, 35, 130, 60, [14, 25, 42]);
    sc.rect(95, 30, 130, 60, [19, 34, 57]);
    sc.rect(120, 45, 60, 28, [170, 172, 168]);
    for (const px of [105, 130, 155, 180, 205]) {
      sc.rect(px, 20, 6, 10, pin);
      sc.rect(px, 90, 6, 10, pin);
    }
    for (const py of [40, 55, 70]) {
      sc.rect(85, py, 10, 6, pin);
      sc.rect(225, py, 10, 6, pin);
    }
    sc.line(285, 0, 285, 24, 2, [70, 90, 115]);
    sc.line(300, 0, 300, 24, 2, [70, 90, 115]);
    sc.circle(285, 27, 3, [70, 90, 115]);
    sc.circle(300, 27, 3, [70, 90, 115]);
    sc.poly(
      [
        [230, 116],
        [272, 86],
        [296, 88],
        [294, 102],
        [258, 120],
        [236, 122],
      ],
      [170, 172, 168],
    );
    sc.poly(
      [
        [214, 118],
        [234, 112],
        [238, 118],
        [218, 124],
      ],
      [170, 172, 168],
    );
    sc.rect(0, 114, 320, 14, [11, 21, 35]);
  },

  // Puigdemont: a courthouse with dome, columns and six small flags.
  courthouse(sc) {
    sc.gradient([146, 180, 160], [110, 150, 128]);
    const stone: RGB = [11, 60, 52];
    const pale: RGB = [214, 220, 218];
    sc.rect(60, 62, 200, 56, stone);
    sc.poly(
      [
        [48, 62],
        [160, 30],
        [272, 62],
      ],
      stone,
    );
    sc.circle(160, 34, 16, stone);
    sc.rect(150, 16, 20, 18, stone);
    sc.rect(52, 58, 216, 8, stone);
    for (const cx of [76, 112, 148, 184, 220]) sc.rect(cx, 70, 12, 42, pale);
    sc.rect(150, 88, 20, 30, [6, 40, 34]);
    const flagCols: RGB[] = [
      [166, 44, 30],
      [176, 118, 20],
      [18, 96, 84],
      [24, 96, 56],
      [110, 58, 130],
      [38, 106, 150],
    ];
    flagCols.forEach((c, i) => {
      const fx = 84 + i * 30;
      sc.rect(fx, 26, 2, 12, stone);
      sc.rect(fx + 2, 26, 15, 9, c);
    });
    sc.rect(0, 118, 320, 10, [10, 53, 46]);
  },

  // Grok suits: courthouse pillars under a purple sky, scales of justice.
  scales(sc) {
    sc.gradient([178, 146, 171], [74, 40, 88]);
    const pillar: RGB = [61, 32, 72];
    const tops: [number, number][] = [
      [30, 30],
      [78, 18],
      [126, 38],
      [174, 24],
      [222, 44],
      [270, 30],
    ];
    for (const [px, py] of tops) sc.rect(px, py, 22, 128 - py, pillar);
    sc.line(222, 84, 298, 40, 5, CREAM);
    sc.line(222, 84, 208, 94, 3, CREAM);
    sc.line(222, 84, 252, 94, 3, CREAM);
    sc.poly(
      [
        [206, 94],
        [256, 94],
        [231, 102],
      ],
      CREAM,
    );
    sc.line(298, 40, 276, 48, 3, CREAM);
    sc.line(298, 40, 312, 48, 3, CREAM);
    sc.poly(
      [
        [274, 48],
        [314, 48],
        [294, 55],
      ],
      CREAM,
    );
  },

  // Sanctions: a bank front with pediment, coin and a small flag.
  bank(sc) {
    sc.gradient([122, 132, 148], [84, 94, 112]);
    const dark: RGB = [11, 21, 35];
    sc.rect(18, 16, 151, 37, dark);
    sc.poly(
      [
        [8, 16],
        [93, 4],
        [178, 16],
      ],
      dark,
    );
    sc.circle(93, 11, 7, [198, 188, 164]);
    sc.rect(118, 1, 2, 10, dark);
    sc.rect(120, 1, 13, 8, [38, 106, 150]);
    sc.circle(126, 5, 2, [176, 118, 20]);
    for (const wx of [34, 82, 130]) sc.rect(wx, 26, 10, 14, [190, 196, 200]);
  },

  // Factory fire: roofline and chimney, cream flames against salmon sky.
  factory(sc) {
    sc.gradient([214, 140, 116], [188, 96, 78]);
    const dark: RGB = [110, 44, 36];
    sc.rect(8, 30, 142, 23, dark);
    sc.poly(
      [
        [8, 30],
        [60, 16],
        [150, 30],
      ],
      dark,
    );
    sc.rect(128, 8, 12, 22, dark);
    sc.circle(140, 8, 6, [150, 130, 120]);
    sc.circle(154, 5, 4, [150, 130, 120]);
    sc.poly(
      [
        [44, 34],
        [52, 22],
        [60, 34],
      ],
      [240, 170, 60],
    );
    sc.poly(
      [
        [30, 36],
        [38, 26],
        [46, 36],
      ],
      CREAM,
    );
    sc.poly(
      [
        [62, 36],
        [70, 27],
        [78, 36],
      ],
      CREAM,
    );
  },

  // Gaza: a dark damaged skyline under a pale green sky.
  gaza(sc) {
    sc.gradient([150, 172, 132], [126, 148, 110]);
    const dark: RGB = [20, 40, 20];
    const bars: [number, number][] = [
      [0, 20],
      [16, 30],
      [28, 24],
      [46, 36],
      [60, 26],
      [80, 32],
      [92, 22],
      [108, 34],
      [126, 25],
      [138, 30],
      [154, 21],
      [168, 28],
    ];
    for (const [bx, bh] of bars) sc.rect(bx, 53 - bh, 13, bh, dark);
    sc.circle(60, 20, 5, dark);
    sc.rect(0, 50, 187, 3, [14, 32, 14]);
  },

  // Zscaler deal: skyline with a bold rising arrow.
  "skyline-arrow"(sc) {
    sc.gradient([120, 164, 142], [96, 140, 120]);
    const dark: RGB = [10, 53, 46];
    const bars: [number, number][] = [
      [0, 26],
      [18, 36],
      [36, 22],
      [54, 32],
      [126, 28],
      [144, 38],
      [162, 24],
    ];
    for (const [bx, bh] of bars) sc.rect(bx, 53 - bh, 16, bh, dark);
    sc.line(92, 36, 124, 36, 6, CREAM);
    sc.line(124, 36, 124, 20, 6, CREAM);
    sc.line(124, 20, 150, 20, 6, CREAM);
    sc.poly(
      [
        [150, 12],
        [166, 20],
        [150, 28],
      ],
      CREAM,
    );
  },

  // Ahmadi: mountain ridges, a moon and a ring light on its stand.
  stage(sc) {
    sc.fill([61, 32, 72]);
    sc.poly(
      [
        [0, 53],
        [50, 14],
        [100, 53],
      ],
      [110, 58, 130],
    );
    sc.poly(
      [
        [60, 53],
        [115, 8],
        [170, 53],
      ],
      [110, 58, 130],
    );
    sc.poly(
      [
        [130, 53],
        [165, 20],
        [187, 53],
      ],
      [110, 58, 130],
    );
    sc.circle(158, 12, 7, CREAM);
    sc.ring(118, 22, 16, 3, CREAM);
    sc.line(118, 38, 118, 53, 3, CREAM);
    sc.rect(0, 46, 187, 7, [43, 22, 54]);
  },

  // Brentford: floodlit stadium, pale pitch band, dashed line, ball.
  stadium(sc) {
    sc.fill([16, 36, 16]);
    sc.rect(0, 10, 187, 20, [24, 52, 24]);
    for (const lx of [30, 70, 120, 160]) {
      sc.rect(lx, 4, 2, 8, [120, 140, 120]);
      sc.circle(lx + 1, 4, 3, CREAM);
    }
    sc.rect(0, 32, 187, 8, [140, 160, 110]);
    sc.rect(0, 42, 187, 11, [46, 96, 44]);
    for (let dx = 8; dx < 180; dx += 16) sc.rect(dx, 46, 8, 2, CREAM);
    sc.circle(160, 47, 6, CREAM);
    sc.circle(158, 45, 1, [16, 36, 16]);
    sc.circle(163, 49, 1, [16, 36, 16]);
  },

  // Screening trial: a hospital block with lit windows and a roof cross.
  hospital(sc) {
    sc.fill([14, 40, 57]);
    sc.rect(55, 12, 80, 41, [19, 53, 75]);
    sc.rect(92, 1, 6, 13, CREAM);
    sc.rect(86, 4, 18, 6, CREAM);
    for (const wy of [20, 31, 42])
      for (const wx of [64, 88, 112]) sc.rect(wx, wy, 9, 6, [173, 192, 190]);
  },

  // AWACS: a cream patrol plane over a grey horizon.
  awacs(sc) {
    sc.gradient([168, 172, 170], [90, 96, 104]);
    sc.rect(0, 46, 187, 7, [40, 44, 48]);
    sc.poly(
      [
        [52, 18],
        [140, 20],
        [52, 24],
      ],
      CREAM,
    );
    sc.circle(98, 13, 7, CREAM);
    sc.poly(
      [
        [52, 18],
        [42, 7],
        [60, 15],
      ],
      CREAM,
    );
    sc.poly(
      [
        [88, 24],
        [118, 24],
        [104, 33],
      ],
      CREAM,
    );
  },

  // Iowa blast: three explosive barrels and a parasol on ochre ground.
  barrels(sc) {
    sc.gradient([206, 170, 96], [186, 140, 70]);
    sc.rect(0, 40, 187, 13, [120, 84, 30]);
    const dark: RGB = [67, 45, 8];
    for (const bx of [30, 52, 74]) {
      sc.rect(bx, 24, 16, 22, dark);
      sc.rect(bx, 28, 16, 2, [120, 84, 30]);
      sc.rect(bx, 38, 16, 2, [120, 84, 30]);
    }
    sc.poly(
      [
        [118, 14],
        [170, 14],
        [144, 30],
      ],
      dark,
    );
    sc.rect(142, 30, 4, 18, dark);
  },

  // Vanuatu quake: layered ranges, a snow cap, cream epicentre rings.
  quake(sc) {
    sc.fill([216, 186, 128]);
    sc.poly(
      [
        [0, 53],
        [45, 22],
        [95, 53],
      ],
      [150, 110, 60],
    );
    sc.poly(
      [
        [80, 53],
        [130, 16],
        [187, 53],
      ],
      [150, 110, 60],
    );
    sc.poly(
      [
        [0, 53],
        [60, 28],
        [120, 53],
      ],
      [67, 45, 8],
    );
    sc.poly(
      [
        [100, 53],
        [150, 32],
        [187, 53],
      ],
      [67, 45, 8],
    );
    sc.poly(
      [
        [124, 22],
        [130, 16],
        [136, 22],
        [133, 20],
        [130, 23],
        [127, 20],
      ],
      CREAM,
    );
    sc.ring(160, 42, 6, 2, CREAM);
    sc.ring(160, 42, 11, 2, CREAM);
  },
};

// ---------------------------------------------------------------- cards ---
function drawCard(
  card: StoryCard,
  number: number,
  x: number,
  y: number,
  w: number,
  lead: boolean,
  sceneH = 53,
): void {
  const sh = lead ? 128 : sceneH;
  fillRect(x, y, w, lead ? 257 : 153, CARD_BG);
  strokeRect(x, y, w, lead ? 257 : 153, FRAME_LINE);
  const sx = x + 2;
  const sy = y + 2;
  const sw = w - 4;
  const sc = new Scene(sw, sh);
  SCENES[card.scene](sc);
  sc.pasteTo(sx, sy);
  const sceneBottom = sy + sh;

  // green story-number badge in the scene's top-left corner
  fillCircle(sx + 13, sy + 13, 11, TAG_GREEN);
  const label = String(number);
  drawLineCentered("sansB11", label, sx + 13, sy + 17, CREAM);

  if (card.caption !== "") {
    drawLine("sansB10", card.caption, sx + 10, sy + 62, CREAM, 1);
  }
  // the big fact, cream with a hard dark offset shadow; on the small cards
  // the fact is compressed horizontally so long facts stay inside the scene
  if (lead) {
    const factBase = sceneBottom - 11;
    drawLine("sansB42", card.fact, sx + 12, factBase + 3, [10, 10, 12]);
    drawLine("sansB42", card.fact, sx + 10, factBase, CREAM);
  } else {
    const factBase = sceneBottom - 8;
    drawLineSquash("sansB42", card.fact, sx + 4, factBase + 2, [10, 10, 12], 0.6);
    drawLineSquash("sansB42", card.fact, sx + 2, factBase, CREAM, 0.6);
  }

  // certainty + source chip, region label to its right
  const tagY = y + (lead ? 137 : 58);
  const tagW = textWidth("sansB10", card.tag) + 12;
  fillRect(x + 10, tagY, tagW, 13, TAG_GREEN);
  drawLine("sansB10", card.tag, x + 16, tagY + 10, WHITE);
  if (card.region !== "") {
    drawLineRight("sansB10", card.region, x + w - 10, tagY + 10, FAINT, 2);
  }

  const headStyle = lead ? "serif19" : "serif14";
  const headLines = wrap(headStyle, card.headline, w - 20);
  const headFirst = y + (lead ? 170 : 89);
  const headPitch = lead ? 23 : 20;
  headLines.forEach((ln, i) => {
    drawLine(headStyle, ln, x + 10, headFirst + i * headPitch, INK);
  });

  const briefStyle = lead ? "sans11" : "sans11";
  const briefLines = wrap(briefStyle, card.brief, w - 16);
  const briefFirst = y + (lead ? 219 : 128);
  const briefPitch = lead ? 16 : 12;
  const briefInk = lead ? LEAD_BRIEF_INK : CARD_BRIEF_INK;
  briefLines.forEach((ln, i) => {
    drawLine(briefStyle, ln, x + 10, briefFirst + i * briefPitch, briefInk);
  });
}

// ------------------------------------------------------------------ map ---
// Dotted world: one character per ~4.6 px cell, '#' marks land.
const LANDMAP: string[] = [
  "................................................................",
  "....######..............##.....#########################........",
  "..##########...........####...###########################.......",
  "...########............##############################..##.......",
  "....######.............####..####################..............",
  ".....####....##.........###....##########..####................",
  "......##....####........##......########....##......####.......",
  "............######......#........######..............#####......",
  "............#####............................##.......####......",
  ".............###...............................................",
  ".............##................................................",
];

function drawMap(): void {
  strokeRect(14, 922, 296, 54, FRAME_LINE);
  fillRect(15, 923, 294, 52, [214, 220, 218]);
  for (let row = 0; row < LANDMAP.length; row++) {
    for (let col = 0; col < LANDMAP[row].length; col++) {
      const px = 17 + Math.round(col * 4.4);
      const py = 925 + Math.round(row * 4.4);
      if (LANDMAP[row][col] === "#") {
        fillRect(px, py, 2, 2, [96, 102, 96]);
      } else {
        fillRect(px, py, 2, 2, [200, 206, 200]);
      }
    }
  }
  const pins: [number, number, RGB][] = [
    [46, 940, REGION_RGB.Americas],
    [60, 959, REGION_RGB.Americas],
    [163, 937, REGION_RGB.Europe],
    [163, 957, REGION_RGB.Africa],
    [183, 945, REGION_RGB["Middle East"]],
    [222, 951, REGION_RGB["Asia-Pacific"]],
    [278, 960, REGION_RGB.Oceania],
  ];
  for (const [px, py, c] of pins) fillCircle(px, py, 8, c);

  // segmented region bar under the map
  const total = BAR_SEGMENTS.reduce((s, seg) => s + seg.count, 0);
  let bx = 14;
  BAR_SEGMENTS.forEach((seg, i) => {
    const isLast = i === BAR_SEGMENTS.length - 1;
    const bw = isLast ? 308 - bx : Math.round((seg.count / total) * 294);
    fillRect(bx, 980, bw, 11, REGION_RGB[seg.region]);
    bx += bw;
  });
  LEGEND_LINES.forEach((ln, i) => {
    drawLine("sans10", ln, 14, 1001 + i * 10, INK);
  });
}

// ----------------------------------------------------------------- page ---
function composePage(): void {
  frame.fill(0);
  for (let i = 0; i < frame.length; i += 3) {
    frame[i] = PAPER[0];
    frame[i + 1] = PAPER[1];
    frame[i + 2] = PAPER[2];
  }

  // masthead
  drawLine("sansB10", "ONE DAY • ONE PAGE • 35 STORIES • 7 REGIONS", 14, 23, INK, 1);
  drawLineRight("sansB10", "MONDAY EDITION", 1010, 23, INK, 1);
  drawLineCentered("serif54", "THE WORLD IN ONE DAY", 512, 80, INK, 12);
  fillRect(14, 90, 996, 3, INK);
  fillRect(14, 96, 996, 1, INK);
  drawLineCentered("serif23", "MONDAY 23 NOVEMBER 2026", 512, 124, INK, 1);
  fillRect(14, 116, 316, 1, FRAME_LINE);
  fillRect(692, 116, 318, 1, FRAME_LINE);

  // the day in UTC
  fillRect(15, 135, 994, 40, STRIP_BG);
  strokeRect(14, 134, 996, 42, FRAME_LINE);
  drawLine("sansB10", "THE DAY", 24, 151, INK);
  drawLine("sansB10", "IN UTC", 24, 167, INK);
  UTC_COLUMNS.forEach((col, ci) => {
    const cx = 116 + ci * 231;
    col.forEach((entry, ri) => {
      const bar = entry.indexOf("|");
      const time = entry.slice(0, bar);
      const what = entry.slice(bar + 1);
      const base = ri === 0 ? 153 : 167;
      const end = drawLine("sansB11", time, cx, base, INK);
      drawLine("sans11", what, end + 2, base, BODY_GRAY);
    });
  });

  // three parallel leads
  const leadX = [14, 350, 686];
  LEADS.forEach((card, i) => drawCard(card, i + 1, leadX[i], 186, 324, true));

  // ten illustrated grid cards, five across, two rows
  const gridX = [14, 215, 416, 618, 819];
  CARDS.forEach((card, i) => {
    const gx = gridX[i % 5];
    const gy = i < 5 ? 452 : 612;
    drawCard(card, i + 4, gx, gy, 191, false, i < 5 ? 52 : 54);
  });

  // the rest of the day, in brief
  fillRect(14, 770, 996, 1, FRAME_LINE);
  const headEnd = drawLine("sansB11", "THE REST OF THE DAY", 14, 786, INK, 2);
  drawLine("serif14", "— in brief", headEnd + 6, 786, INK);
  BRIEFS.forEach((line, i) => {
    const colX = i < 11 ? 14 : 527;
    const base = 800 + (i % 11) * 11;
    const colour = REGION_RGB[line.region];
    fillCircle(colX + 8, base - 4, 7, colour);
    drawLineCentered("sansB9", String(i + 14), colX + 8, base - 1, WHITE);
    const whoEnd = drawLine("sansB11", line.who, colX + 19, base, BODY_GRAY);
    drawLine("sans11", "— " + line.text, whoEnd + 1, base, BODY_GRAY);
  });

  // bottom band: map + date check
  fillRect(14, 914, 996, 1, FRAME_LINE);
  drawMap();
  const dcEnd = drawLine("sansB11", "DATE CHECK", 323, 928, INK, 1);
  drawLine(
    "serif14",
    "— big stories we left out, with their real dates",
    dcEnd + 6,
    928,
    INK,
  );
  const drawCheck = (
    items: typeof DATE_CHECK_LEFT,
    x: number,
  ): void => {
    items.forEach((item, i) => {
      const base = 946 + Math.round(i * (31 / 3));
      // the whole line is measured first; if it would run past the next
      // column it is compressed horizontally to fit its measure
      const parts: [string, string, RGB][] = [
        ["sans10", item.name, BODY_GRAY],
        ["sans10", " — ", BODY_GRAY],
        ["sansB10", item.date, ALERT_RED],
        ["sans10", " · " + item.note, BODY_GRAY],
      ];
      const total = parts.reduce((s, [st, tx]) => s + textWidth(st, tx), 0);
      const squash = Math.min(1, 348 / total);
      let pen = x;
      for (const [st, tx, c] of parts) {
        pen =
          squash < 1
            ? drawLineSquash(st, tx, pen, base, c, squash)
            : drawLine(st, tx, pen, base, c);
      }
    });
  };
  drawCheck(DATE_CHECK_LEFT, 323);
  drawCheck(DATE_CHECK_RIGHT, 677);

  // not yet: what the day has not reached
  const nyEnd = drawLine("sansB9", "NOT YET — after 23 Nov:", 14, 1019, ALERT_RED);
  drawLineSquash("sans10", NOT_YET_TEXT, nyEnd + 9, 1019, BODY_GRAY, 0.8);
}

function main(): void {
  composePage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const png = encodePNG();
  const target = join(outDir, "entry.png");
  writeFileSync(target, png);
  console.log(`wrote ${target} (${png.length} bytes)`);
}

main();
