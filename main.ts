// THE WORLD IN ONE PAGE — Monday 23 November 2026 (Template v4)
// Text is typeset from pre-rendered FreeType glyph bitmaps (atlas.dat),
// blitted 1:1 onto the final frame. Scenes are painted on a 2x buffer
// and box-downsampled. No outline fonts anywhere.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEADS, CARDS, BRIEFS, UTC_STRIP, DATE_CHECK, NOT_YET,
  REGION_BAR, REGION_COLORS, type Pictured,
} from "./data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 1024, H = 1024;
type RGB = [number, number, number];

// ---------- atlas ----------
interface Glyph { x: number; y: number; w: number; h: number; dx: number; dy: number; adv: number }
interface Style { ascent: number; descent: number; glyphs: Record<string, Glyph> }

const raw = readFileSync(HERE + "/atlas.dat");
const hlen = raw.readUInt32BE(0);
const header = JSON.parse(raw.subarray(4, 4 + hlen).toString("utf8"));
const PIX = inflateSync(raw.subarray(4 + hlen));
const AW = header.width as number;
const STYLES: Record<string, Style> = {};
for (const [name, s] of Object.entries<any>(header.styles)) {
  const glyphs: Record<string, Glyph> = {};
  for (const [ch, g] of Object.entries<any>(s.glyphs)) {
    glyphs[ch] = { x: g[0], y: g[1], w: g[2], h: g[3], dx: g[4], dy: g[5], adv: g[6] };
  }
  STYLES[name] = { ascent: s.ascent, descent: s.descent, glyphs };
}
function glyphOf(style: string, ch: string): Glyph {
  const st = STYLES[style];
  return st.glyphs[ch] ?? st.glyphs["?"] ?? { x: 0, y: 0, w: 0, h: 0, dx: 0, dy: 0, adv: 6 };
}

// ---------- pixel buffer ----------
export class Buf {
  w: number; h: number; d: Uint8Array;
  constructor(w: number, h: number, c: RGB) {
    this.w = w; this.h = h; this.d = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) { this.d[i * 3] = c[0]; this.d[i * 3 + 1] = c[1]; this.d[i * 3 + 2] = c[2]; }
  }
  set(x: number, y: number, c: RGB, a = 1) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    if (a >= 1) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; }
    else {
      this.d[i] += (c[0] - this.d[i]) * a;
      this.d[i + 1] += (c[1] - this.d[i + 1]) * a;
      this.d[i + 2] += (c[2] - this.d[i + 2]) * a;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1) {
    for (let yy = Math.max(0, y | 0); yy < Math.min(this.h, y + h); yy++)
      for (let xx = Math.max(0, x | 0); xx < Math.min(this.w, x + w); xx++) this.set(xx, yy, c, a);
  }
  // vertical gradient between two colours, y0..y1
  vgrad(x: number, y0: number, w: number, y1: number, top: RGB, bot: RGB) {
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0 - 1);
      const c: RGB = [0, 1, 2].map(i => Math.round(top[i] + (bot[i] - top[i]) * t)) as RGB;
      this.rect(x, y, w, 1, c);
    }
  }
  disc(cx: number, cy: number, r: number, c: RGB, a = 1) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c, a);
      }
  }
  ring(cx: number, cy: number, r: number, c: RGB, th = 2, a = 1) {
    for (let t = 0; t < th; t++) {
      const rr = r - t;
      for (let k = 0; k < 360; k += 1) {
        const rad = (k * Math.PI) / 180;
        this.set(cx + rr * Math.cos(rad), cy + rr * Math.sin(rad), c, a);
      }
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, th = 1, a = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps, y = y0 + ((y1 - y0) * s) / steps;
      if (th <= 1) this.set(x, y, c, a);
      else this.disc(x, y, th / 2, c, a);
    }
  }
  poly(pts: Array<[number, number]>, c: RGB, a = 1) {
    let minY = 1e9, maxY = -1e9;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [xa, ya] = pts[i], [xb, yb] = pts[(i + 1) % pts.length];
        if ((ya <= y && yb > y) || (yb <= y && ya > y)) xs.push(xa + ((y - ya) / (yb - ya)) * (xb - xa));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2)
        for (let x = Math.floor(xs[i]); x <= xs[i + 1]; x++) this.set(x, y, c, a);
    }
  }
  // box-downsample a 2x buffer into this one at (ox,oy)
  blitDown(src: Buf, ox: number, oy: number) {
    for (let y = 0; y < src.h / 2; y++)
      for (let x = 0; x < src.w / 2; x++) {
        let r = 0, g = 0, b = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * src.w + x * 2 + dx) * 3;
          r += src.d[i]; g += src.d[i + 1]; b += src.d[i + 2];
        }
        this.set(ox + x, oy + y, [r / 4, g / 4, b / 4]);
      }
  }
}

// ---------- text engine (glyph bitmaps blitted 1:1) ----------
const frame = new Buf(W, H, [247, 243, 233]);

export function textW(style: string, s: string, track = 0): number {
  let w = 0;
  for (const ch of s) w += glyphOf(style, ch).adv + track;
  return w - (s.length ? track : 0);
}
// Draw text with baseline at (x, baseY). sx<1 compresses horizontally.
export function drawText(buf: Buf, style: string, s: string, x: number, baseY: number, ink: RGB, track = 0, sx = 1) {
  let pen = x;
  for (const ch of s) {
    const g = glyphOf(style, ch);
    if (g.w > 0) {
      const dw = Math.max(1, Math.round(g.w * sx));
      for (let gy = 0; gy < g.h; gy++)
        for (let gx = 0; gx < dw; gx++) {
          const srcX = g.x + Math.min(g.w - 1, Math.floor(gx / sx));
          const v = PIX[(g.y + gy) * AW + srcX];
          if (v > 0) buf.set(pen + g.dx * sx + gx, baseY + g.dy + gy, ink, v / 255);
        }
    }
    pen += (g.adv + track) * sx;
  }
  return pen - x;
}
export function drawTextC(buf: Buf, style: string, s: string, cx: number, baseY: number, ink: RGB, track = 0, sx = 1) {
  return drawText(buf, style, s, cx - textW(style, s, track) * sx / 2, baseY, ink, track, sx);
}
export function drawTextR(buf: Buf, style: string, s: string, xr: number, baseY: number, ink: RGB, track = 0, sx = 1) {
  return drawText(buf, style, s, xr - textW(style, s, track) * sx, baseY, ink, track, sx);
}
// Word-wrap to a pixel width; returns lines. Warns (console) if a line still overflows.
export function wrap(style: string, s: string, maxW: number, track = 0, sx = 1): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const wd of words) {
    const trial = cur ? cur + " " + wd : wd;
    if (textW(style, trial, track) * sx <= maxW || !cur) cur = trial;
    else { lines.push(cur); cur = wd; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- PNG encoder (per-row best filter, zlib) ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
export function encodePNG(buf: Buf): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(buf.w, 0); ihdr.writeUInt32BE(buf.h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const stride = buf.w * 3;
  const rows: Buffer[] = [];
  let prev: Uint8Array | null = null;
  for (let y = 0; y < buf.h; y++) {
    const row = buf.d.subarray(y * stride, (y + 1) * stride);
    let bestType = 0, bestScore = Infinity, best: Buffer | null = null;
    for (let f = 0; f <= 4; f++) {
      const out = Buffer.alloc(stride);
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 3 ? row[i - 3] : 0;
        const b = prev ? prev[i] : 0;
        const c = prev && i >= 3 ? prev[i - 3] : 0;
        let pred = 0;
        if (f === 1) pred = a;
        else if (f === 2) pred = b;
        else if (f === 3) pred = (a + b) >> 1;
        else if (f === 4) {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (row[i] - pred) & 0xff;
        out[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) { bestScore = score; bestType = f; best = out; }
    }
    rows.push(Buffer.concat([Buffer.from([bestType]), best!]));
    prev = row;
  }
  const idat = deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- shared scene helpers (2x scene buffers) ----------
// All scene painters draw in a coordinate space of (0..sw, 0..sh) at 2x.
export function smoke(g: Buf, cx: number, cy: number, r: number, col: RGB, n = 7) {
  for (let i = 0; i < n; i++) {
    const t = i / n;
    g.disc(cx + Math.sin(i * 2.3) * r * 0.35, cy - t * r * 1.5, r * (0.55 + t * 0.75), col, 0.16);
  }
}
export function flame(g: Buf, cx: number, base: number, wdt: number, hgt: number) {
  const layers: Array<[RGB, number]> = [[[216, 84, 30], 1], [[240, 140, 40], 0.7], [[250, 200, 90], 0.45]];
  for (const [col, s] of layers) {
    const w2 = (wdt / 2) * s, h2 = hgt * s;
    g.poly([[cx - w2, base], [cx - w2 * 0.4, base - h2 * 0.5], [cx, base - h2], [cx + w2 * 0.5, base - h2 * 0.45], [cx + w2, base]], col, 0.92);
    g.poly([[cx + w2 * 0.25, base], [cx + w2 * 0.42, base - h2 * 0.34], [cx + w2 * 0.62, base - h2 * 0.58], [cx + w2 * 0.78, base - h2 * 0.2], [cx + w2 * 0.85, base]], col, 0.92);
  }
}
export function windows(g: Buf, x: number, y: number, cols: number, rows: number, cw: number, chh: number, gap: number, col: RGB, a = 0.85) {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if ((r * 7 + c * 3) % 4 !== 0) g.rect(x + c * (cw + gap), y + r * (chh + gap), cw, chh, col, a);
}

// ---------- scene painters (pictorial, drawn in code) ----------
type Painter = (g: Buf) => void;
const INK: RGB = [26, 26, 24];

const sceneNvidia: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [18, 28, 52], [9, 13, 26]);
  // skyline silhouette
  g.rect(0, h * 0.78, w, h * 0.22, [7, 10, 19]);
  let bx = 0;
  while (bx < w) { const bw = w * (0.05 + ((bx * 37) % 10) / 90); g.rect(bx, h * 0.70 + ((bx * 13) % 17), bw, h * 0.3, [7, 10, 19]); bx += bw + 2; }
  // candlesticks rising left -> right
  const base = h * 0.86;
  for (let i = 0; i < 7; i++) {
    const cx = w * (0.46 + i * 0.075), top = base - h * (0.18 + i * 0.085), bh = h * (0.13 + (i % 3) * 0.03);
    const col: RGB = i === 3 ? [214, 80, 60] : [44, 178, 92];
    g.line(cx, top - h * 0.06, cx, top + bh + h * 0.04, col, 3);
    g.rect(cx - w * 0.016, top, w * 0.032, bh, col);
  }
  // rising glow line over the candles
  let px = w * 0.44, py = base - h * 0.24;
  for (let i = 1; i < 7; i++) {
    const nx = w * (0.46 + i * 0.075), ny = base - h * (0.30 + i * 0.085);
    g.line(px, py, nx, ny, [130, 235, 160], 3);
    g.disc(nx, ny, 4, [180, 255, 200]);
    px = nx; py = ny;
  }
  // the chip, foreground left, on a circuit board
  const cw = w * 0.30, chh = h * 0.62, cx0 = w * 0.06, cy0 = h * 0.26;
  g.rect(cx0 - 6, cy0 - 6, cw + 12, chh + 12, [13, 34, 30]);
  for (let i = 0; i < 6; i++) { // board traces
    g.line(cx0 - 6, cy0 + i * chh / 5, cx0 - w * 0.05, cy0 + i * chh / 5, [40, 110, 84], 2);
    g.line(cx0 + cw + 6, cy0 + i * chh / 5, cx0 + cw + w * 0.04, cy0 + i * chh / 5, [40, 110, 84], 2);
  }
  g.rect(cx0, cy0, cw, chh, [22, 44, 70]);
  g.rect(cx0 + cw * 0.22, cy0 + chh * 0.2, cw * 0.56, chh * 0.6, [34, 66, 102]);
  g.rect(cx0 + cw * 0.34, cy0 + chh * 0.32, cw * 0.32, chh * 0.36, [52, 96, 140]);
  for (let i = 0; i < 5; i++) { // pins
    g.rect(cx0 - 10, cy0 + 8 + i * (chh - 16) / 4, 10, 5, [170, 180, 190]);
    g.rect(cx0 + cw, cy0 + 8 + i * (chh - 16) / 4, 10, 5, [170, 180, 190]);
  }
};

const scenePuigdemont: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [158, 188, 218], [232, 236, 240]);
  g.disc(w * 0.85, h * 0.2, h * 0.11, [250, 226, 150], 0.9);
  g.rect(0, h * 0.82, w, h * 0.18, [196, 186, 164]); // plaza
  // courthouse: steps, columns, pediment
  const bw = w * 0.56, bx = w * 0.16, by = h * 0.30;
  g.rect(bx - w * 0.03, h * 0.80, bw + w * 0.06, h * 0.045, [178, 168, 148]);
  g.rect(bx - w * 0.015, h * 0.775, bw + w * 0.03, h * 0.03, [188, 178, 158]);
  g.rect(bx, by + h * 0.16, bw, h * 0.315, [226, 216, 192]); // body behind columns
  // open door with warm light
  g.rect(bx + bw * 0.42, by + h * 0.26, bw * 0.16, h * 0.215, [70, 52, 34]);
  g.poly([[bx + bw * 0.42, h * 0.775], [bx + bw * 0.58, h * 0.775], [bx + bw * 0.66, h * 0.86], [bx + bw * 0.34, h * 0.86]], [250, 202, 110], 0.55);
  for (let i = 0; i < 4; i++) { // columns
    const cx = bx + bw * (0.08 + i * 0.27);
    g.rect(cx, by + h * 0.16, bw * 0.075, h * 0.315, [242, 236, 218]);
    g.rect(cx - 2, by + h * 0.16, bw * 0.075 + 4, h * 0.025, [210, 198, 172]);
    g.rect(cx - 2, by + h * 0.45, bw * 0.075 + 4, h * 0.025, [210, 198, 172]);
  }
  g.rect(bx - w * 0.01, by + h * 0.115, bw + w * 0.02, h * 0.05, [216, 205, 180]); // entablature
  g.poly([[bx - w * 0.01, by + h * 0.115], [bx + bw / 2, by], [bx + bw + w * 0.01, by + h * 0.115]], [164, 74, 56]); // pediment
  g.disc(bx + bw / 2, by + h * 0.075, h * 0.028, [240, 230, 200]);
  // Catalan flag on a pole, right
  const fx = w * 0.83, fy = h * 0.16;
  g.line(fx, fy, fx, h * 0.80, [90, 84, 76], 4);
  for (let i = 0; i < 9; i++) g.rect(fx + 3, fy + i * h * 0.026, w * 0.115, h * 0.013, i % 2 === 0 ? [226, 178, 40] : [196, 44, 44]);
  // trees
  for (const tx of [0.06, 0.94]) {
    g.rect(w * tx - 2, h * 0.68, 4, h * 0.14, [96, 78, 58]);
    g.disc(w * tx, h * 0.62, h * 0.09, [86, 128, 74]);
    g.disc(w * tx + w * 0.02, h * 0.66, h * 0.06, [96, 140, 82]);
  }
};

const sceneGrok: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [42, 28, 70], [20, 14, 38]);
  // courthouse columns, faint behind
  for (let i = 0; i < 5; i++) {
    const cx = w * (0.55 + i * 0.10);
    g.rect(cx, h * 0.10, w * 0.045, h * 0.62, [150, 138, 190], 0.35);
  }
  g.poly([[w * 0.52, h * 0.10], [w * 0.74, h * 0.015], [w * 0.97, h * 0.10]], [150, 138, 190], 0.35);
  // the phone
  const pw = w * 0.34, ph = h * 0.78, px = w * 0.10, py = h * 0.11;
  g.rect(px - 4, py - 4, pw + 8, ph + 8, [12, 12, 18]);
  g.rect(px, py, pw, ph, [56, 50, 80]);
  // photo tiles with warped faces; two crossed out
  const cols = 2, rows = 3, tw = pw / cols, th = ph / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const tx = px + c * tw + 5, ty = py + r * th + 5, twd = tw - 10, thd = th - 10;
    g.rect(tx, ty, twd, thd, [196, 178, 160]);
    const fcx = tx + twd / 2, fcy = ty + thd * 0.52, fr = twd * 0.26;
    g.disc(fcx, fcy, fr, [232, 196, 160]); // face
    g.poly([[fcx - fr, fcy - fr * 0.4], [fcx + fr, fcy - fr * 0.4], [fcx + fr * 0.7, fcy - fr * 1.05], [fcx - fr * 0.7, fcy - fr * 1.05]], [70, 52, 40]); // hair
    const warp = (r * 2 + c) % 3 === 0 ? fr * 0.35 : 0; // one feature displaced = the fake
    g.disc(fcx - fr * 0.35, fcy - fr * 0.1, 2.4, [30, 30, 30]);
    g.disc(fcx + fr * 0.35 + warp, fcy - fr * 0.1 + warp * 0.5, 2.4, [30, 30, 30]);
    g.line(fcx - fr * 0.3, fcy + fr * 0.45, fcx + fr * 0.3, fcy + fr * 0.4, [120, 70, 60], 2);
    if ((r === 0 && c === 1) || (r === 2 && c === 0)) { // flagged tiles
      g.line(tx + 3, ty + 3, tx + twd - 3, ty + thd - 3, [214, 48, 44], 5);
      g.line(tx + twd - 3, ty + 3, tx + 3, ty + thd - 3, [214, 48, 44], 5);
    }
  }
  // gavel, bottom right
  g.line(w * 0.66, h * 0.86, w * 0.86, h * 0.62, [150, 106, 62], 9);
  g.rect(w * 0.83, h * 0.52, w * 0.13, h * 0.13, [120, 82, 44]);
  g.rect(w * 0.83, h * 0.565, w * 0.13, h * 0.03, [210, 180, 120]);
  g.rect(w * 0.60, h * 0.90, w * 0.30, h * 0.035, [96, 66, 36]);
};

const sceneSanctions: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [34, 76, 166], [24, 54, 118]);
  // circle of twelve gold stars
  const cx = w * 0.20, cy = h * 0.30, rr = h * 0.17;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sx = cx + rr * Math.cos(a), sy = cy + rr * Math.sin(a) * 0.92;
    g.poly([[sx, sy - 6], [sx + 2, sy - 1], [sx + 6, sy - 1], [sx + 3, sy + 2], [sx + 4, sy + 6], [sx, sy + 3], [sx - 4, sy + 6], [sx - 3, sy + 2], [sx - 6, sy - 1], [sx - 2, sy - 1]], [246, 200, 60]);
  }
  // bank buildings along the bottom
  const base = h * 0.86;
  for (let b = 0; b < 3; b++) {
    const bw = w * 0.27, bx = w * (0.06 + b * 0.315), bh = h * (0.34 + (b === 1 ? 0.08 : 0));
    g.rect(bx, base - bh, bw, bh, [230, 222, 200]);
    g.poly([[bx - 4, base - bh], [bx + bw / 2, base - bh - h * 0.10], [bx + bw + 4, base - bh]], [196, 84, 60]);
    for (let i = 0; i < 3; i++) g.rect(bx + bw * (0.14 + i * 0.3), base - bh + h * 0.07, bw * 0.11, bh - h * 0.1, [240, 234, 214]);
  }
  // prohibition ring over the middle bank
  g.ring(w * 0.475, base - h * 0.22, h * 0.185, [216, 44, 40], 7);
  g.line(w * 0.475 - h * 0.13, base - h * 0.22 + h * 0.13, w * 0.475 + h * 0.13, base - h * 0.22 - h * 0.13, [216, 44, 40], 7);
  // water + tanker
  g.rect(0, base, w, h - base, [16, 44, 84]);
  g.poly([[w * 0.60, base + 4], [w * 0.97, base + 4], [w * 0.93, base + h * 0.075], [w * 0.64, base + h * 0.075]], [26, 30, 40]);
  g.rect(w * 0.66, base - h * 0.045, w * 0.07, h * 0.045, [40, 46, 58]);
  g.rect(w * 0.76, base - h * 0.03, w * 0.16, h * 0.03, [52, 58, 70]);
};

const sceneFire: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [128, 116, 106], [178, 164, 148]);
  // factory: long block, sawtooth roof, chimneys
  const fy = h * 0.52;
  g.rect(w * 0.04, fy, w * 0.62, h * 0.34, [158, 146, 132]);
  for (let i = 0; i < 4; i++) g.poly([[w * (0.04 + i * 0.155), fy], [w * (0.115 + i * 0.155), fy - h * 0.09], [w * (0.195 + i * 0.155), fy]], [120, 108, 96]);
  g.rect(w * 0.52, fy - h * 0.30, w * 0.045, h * 0.30, [110, 98, 88]);
  g.rect(w * 0.60, fy - h * 0.24, w * 0.04, h * 0.24, [110, 98, 88]);
  windows(g, w * 0.07, fy + h * 0.08, 7, 2, w * 0.055, h * 0.07, w * 0.02, [70, 62, 54], 0.8);
  flame(g, w * 0.18, fy - h * 0.02, w * 0.13, h * 0.30);
  flame(g, w * 0.36, fy - h * 0.04, w * 0.16, h * 0.38);
  flame(g, w * 0.55, fy - h * 0.10, w * 0.10, h * 0.24);
  smoke(g, w * 0.55, fy - h * 0.34, h * 0.16, [88, 82, 78], 8);
  smoke(g, w * 0.34, fy - h * 0.30, h * 0.13, [100, 94, 88], 7);
  // fire engine, foreground right
  const ey = h * 0.80;
  g.rect(w * 0.68, ey - h * 0.13, w * 0.28, h * 0.13, [196, 44, 38]);
  g.rect(w * 0.88, ey - h * 0.20, w * 0.08, h * 0.20, [178, 38, 32]);
  g.rect(w * 0.895, ey - h * 0.185, w * 0.05, h * 0.06, [170, 210, 226]);
  g.rect(w * 0.70, ey - h * 0.105, w * 0.16, h * 0.035, [240, 236, 228]);
  g.line(w * 0.70, ey - h * 0.13, w * 0.60, ey - h * 0.30, [220, 224, 228], 4); // ladder
  g.disc(w * 0.735, ey + h * 0.015, h * 0.045, [30, 30, 32]);
  g.disc(w * 0.915, ey + h * 0.015, h * 0.045, [30, 30, 32]);
  g.line(w * 0.685, ey - h * 0.10, w * 0.60, ey - h * 0.22, [150, 200, 235], 3); // hose arc
  g.rect(0, h * 0.88, w, h * 0.12, [74, 68, 62]);
};

const sceneGaza: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [186, 172, 148], [206, 192, 168]);
  const base = h * 0.84;
  // ruined blocks with jagged tops
  const blocks: Array<[number, number, number]> = [[0.03, 0.30, 0.20], [0.26, 0.44, 0.17], [0.46, 0.26, 0.22], [0.66, 0.40, 0.16], [0.84, 0.30, 0.14]];
  for (const [fx, fh, fw] of blocks) {
    const bx = w * fx, bw = w * fw, top = base - h * fh;
    g.poly([[bx, base], [bx, top + h * 0.05], [bx + bw * 0.3, top], [bx + bw * 0.45, top + h * 0.09], [bx + bw * 0.7, top + h * 0.02], [bx + bw, top + h * 0.07], [bx + bw, base]], [148, 138, 122]);
    windows(g, bx + 5, top + h * 0.12, 3, 3, bw * 0.16, h * 0.05, bw * 0.08, [88, 80, 70], 0.75);
  }
  // leaning slab + rubble
  g.poly([[w * 0.40, base], [w * 0.52, base - h * 0.16], [w * 0.56, base - h * 0.11], [w * 0.47, base]], [132, 122, 108]);
  for (let i = 0; i < 9; i++) g.poly([[w * (0.06 + i * 0.1), base + h * 0.02], [w * (0.10 + i * 0.1), base - h * 0.045], [w * (0.14 + i * 0.1), base + h * 0.02]], [120, 110, 96]);
  // cracked water tank on a stand
  g.line(w * 0.90, base, w * 0.90, base - h * 0.34, [96, 88, 78], 4);
  g.line(w * 0.97, base, w * 0.97, base - h * 0.34, [96, 88, 78], 4);
  g.rect(w * 0.865, base - h * 0.46, w * 0.14, h * 0.12, [160, 148, 128]);
  g.line(w * 0.88, base - h * 0.45, w * 0.93, base - h * 0.36, [70, 62, 54], 3);
  g.line(w * 0.93, base - h * 0.36, w * 0.90, base - h * 0.35, [70, 62, 54], 3);
  // hazard placard
  g.poly([[w * 0.10, base - h * 0.20], [w * 0.145, base - h * 0.115], [w * 0.055, base - h * 0.115]], [232, 178, 40]);
  g.line(w * 0.10, base - h * 0.175, w * 0.10, base - h * 0.14, [40, 36, 30], 4);
  g.disc(w * 0.10, base - h * 0.128, 2.5, [40, 36, 30]);
  g.rect(0, base, w, h - base, [168, 152, 128]);
};

const sceneMerger: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [16, 52, 66], [10, 30, 42]);
  // two server towers leaning together into one shield
  for (const [fx, tilt] of [[0.16, 1], [0.58, -1]] as Array<[number, number]>) {
    const bx = w * fx, bw = w * 0.24;
    for (let r = 0; r < 4; r++) {
      const off = tilt * r * w * 0.012;
      g.rect(bx + off, h * (0.16 + r * 0.17), bw, h * 0.13, [30, 84, 100]);
      for (let i = 0; i < 4; i++) g.disc(bx + off + bw * (0.16 + i * 0.22), h * (0.225 + r * 0.17), 3, i % 2 ? [96, 220, 180] : [250, 190, 90]);
    }
  }
  // converging arrows
  g.line(w * 0.30, h * 0.88, w * 0.48, h * 0.60, [240, 180, 80], 6);
  g.line(w * 0.72, h * 0.88, w * 0.54, h * 0.60, [240, 180, 80], 6);
  // the combined shield
  g.poly([[w * 0.51, h * 0.30], [w * 0.63, h * 0.36], [w * 0.63, h * 0.52], [w * 0.51, h * 0.64], [w * 0.39, h * 0.52], [w * 0.39, h * 0.36]], [38, 130, 108]);
  g.line(w * 0.455, h * 0.47, w * 0.495, h * 0.525, [240, 250, 240], 6);
  g.line(w * 0.495, h * 0.525, w * 0.565, h * 0.42, [240, 250, 240], 6);
};

const sceneAhmadi: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [88, 52, 84], [196, 120, 74]); // dusk over the caravanserai
  g.disc(w * 0.82, h * 0.22, h * 0.09, [250, 206, 130], 0.85);
  // great pointed arch
  g.poly([[w * 0.28, h * 0.92], [w * 0.28, h * 0.38], [w * 0.40, h * 0.16], [w * 0.50, h * 0.06], [w * 0.60, h * 0.16], [w * 0.72, h * 0.38], [w * 0.72, h * 0.92], [w * 0.62, h * 0.92], [w * 0.62, h * 0.42], [w * 0.50, h * 0.20], [w * 0.38, h * 0.42], [w * 0.38, h * 0.92]], [214, 178, 138]);
  g.rect(0, h * 0.92, w, h * 0.08, [120, 84, 60]); // stage floor
  // lone microphone stand inside the arch
  g.line(w * 0.50, h * 0.92, w * 0.50, h * 0.52, [30, 26, 30], 4);
  g.line(w * 0.50, h * 0.52, w * 0.545, h * 0.44, [30, 26, 30], 4);
  g.disc(w * 0.555, h * 0.425, h * 0.035, [30, 26, 30]);
  g.line(w * 0.44, h * 0.92, w * 0.50, h * 0.86, [30, 26, 30], 3);
  g.line(w * 0.56, h * 0.92, w * 0.50, h * 0.86, [30, 26, 30], 3);
  // musical notes drifting up, unbowed
  for (const [fx, fy, s] of [[0.16, 0.30, 1], [0.22, 0.18, 0.8], [0.80, 0.36, 0.9], [0.86, 0.52, 0.7]] as Array<[number, number, number]>) {
    const nx = w * fx, ny = h * fy, r = h * 0.028 * s;
    g.disc(nx, ny, r, [250, 232, 190], 0.95);
    g.line(nx + r, ny, nx + r, ny - h * 0.11 * s, [250, 232, 190], 3);
    g.poly([[nx + r, ny - h * 0.11 * s], [nx + r + w * 0.02 * s, ny - h * 0.09 * s], [nx + r, ny - h * 0.07 * s]], [250, 232, 190], 0.95);
  }
};

const sceneStadium: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [14, 22, 48], [24, 36, 66]); // night
  // floodlight pylons with light cones
  for (const fx of [0.08, 0.92]) {
    g.line(w * fx, h * 0.52, w * fx, h * 0.10, [180, 186, 196], 5);
    g.rect(w * fx - w * 0.045, h * 0.045, w * 0.09, h * 0.075, [226, 232, 240]);
    g.poly([[w * fx - w * 0.04, h * 0.12], [w * fx + w * 0.04, h * 0.12], [w * (fx === 0.08 ? 0.42 : 0.58), h * 0.72], [w * (fx === 0.08 ? 0.20 : 0.80), h * 0.72]], [250, 246, 200], 0.13);
    g.disc(w * fx, h * 0.08, h * 0.05, [255, 252, 220], 0.9);
  }
  // stand band
  g.rect(0, h * 0.50, w, h * 0.13, [52, 58, 84]);
  for (let i = 0; i < 60; i++) g.set(w * (0.02 + (i * 37 % 96) / 100), h * (0.52 + (i * 13 % 9) / 100), [200 + (i % 3) * 18, 170, 130], 0.8);
  // pitch with stripes and markings
  g.rect(0, h * 0.63, w, h * 0.37, [44, 122, 52]);
  for (let i = 0; i < 5; i++) if (i % 2) g.rect(w * i * 0.2, h * 0.63, w * 0.2, h * 0.37, [52, 136, 60]);
  g.line(0, h * 0.815, w, h * 0.815, [240, 244, 240], 3);
  g.ring(w * 0.5, h * 0.815, h * 0.085, [240, 244, 240], 3);
  // scoreboard (the natural home of the score)
  g.rect(w * 0.335, h * 0.185, w * 0.33, h * 0.20, [10, 12, 20]);
  g.rect(w * 0.345, h * 0.195, w * 0.31, h * 0.18, [24, 30, 44]);
};

const sceneScreening: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [226, 236, 238], [206, 220, 224]); // clinic light
  g.rect(0, h * 0.86, w, h * 0.14, [188, 198, 202]);
  // mammography machine: column, C-arm, paddle, base
  const mx = w * 0.30;
  g.rect(mx, h * 0.10, w * 0.075, h * 0.76, [150, 164, 172]);
  g.rect(mx - w * 0.02, h * 0.06, w * 0.115, h * 0.07, [130, 144, 154]);
  g.poly([[mx + w * 0.075, h * 0.20], [mx + w * 0.26, h * 0.30], [mx + w * 0.26, h * 0.38], [mx + w * 0.075, h * 0.30]], [168, 182, 190]); // arm
  g.rect(mx + w * 0.20, h * 0.36, w * 0.13, h * 0.045, [120, 134, 144]); // compression paddle
  g.rect(mx + w * 0.185, h * 0.46, w * 0.16, h * 0.035, [176, 190, 198]); // plate
  g.rect(mx - w * 0.03, h * 0.84, w * 0.20, h * 0.045, [130, 144, 154]); // base
  g.disc(mx + w * 0.035, h * 0.55, h * 0.035, [232, 122, 140]); // status light, pink
  // monitor with a scan image
  const sx = w * 0.60, sy = h * 0.14, sw = w * 0.34, sh = h * 0.46;
  g.rect(sx - 4, sy - 4, sw + 8, sh + 8, [40, 46, 52]);
  g.rect(sx, sy, sw, sh, [22, 26, 32]);
  g.disc(sx + sw * 0.48, sy + sh * 0.52, sh * 0.34, [196, 200, 204], 0.85); // tissue fan
  g.disc(sx + sw * 0.50, sy + sh * 0.50, sh * 0.13, [238, 240, 242], 0.9);
  g.ring(sx + sw * 0.62, sy + sh * 0.38, sh * 0.10, [240, 90, 110], 4); // AI flags a spot
  g.line(sx + sw * 0.5, sy + sh, sx + sw * 0.5, sy + sh + h * 0.07, [40, 46, 52], 6);
  g.rect(sx + sw * 0.30, sy + sh + h * 0.07, sw * 0.4, h * 0.03, [40, 46, 52]);
  // ribbon motif, small, bottom right
  g.poly([[w * 0.86, h * 0.68], [w * 0.885, h * 0.76], [w * 0.86, h * 0.86], [w * 0.835, h * 0.76]], [232, 122, 140]);
};

const sceneAwacs: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [120, 152, 188], [196, 208, 220]); // morning sky
  // dashed border line down the right side
  for (let y = h * 0.06; y < h * 0.94; y += h * 0.075) g.line(w * 0.86, y, w * 0.86, y + h * 0.04, [214, 60, 50], 4);
  // the AWACS: fuselage, radar dome, tail, wings, engines, sweep rings
  const fy = h * 0.52;
  g.poly([[w * 0.06, fy], [w * 0.16, fy - h * 0.09], [w * 0.78, fy - h * 0.09], [w * 0.90, fy - h * 0.015], [w * 0.90, fy + h * 0.03], [w * 0.16, fy + h * 0.075], [w * 0.06, fy + h * 0.03]], [228, 232, 236]);
  g.poly([[w * 0.10, fy - h * 0.085], [w * 0.20, fy - h * 0.24], [w * 0.27, fy - h * 0.24], [w * 0.24, fy - h * 0.085]], [200, 208, 216]); // tail fin
  g.rect(w * 0.20, fy - h * 0.255, w * 0.075, h * 0.03, [214, 60, 50]);
  g.poly([[w * 0.42, fy + h * 0.02], [w * 0.62, fy + h * 0.20], [w * 0.68, fy + h * 0.20], [w * 0.56, fy + h * 0.02]], [206, 214, 222]); // wing
  g.rect(w * 0.50, fy + h * 0.10, w * 0.045, h * 0.05, [170, 178, 186]);
  g.rect(w * 0.60, fy + h * 0.13, w * 0.04, h * 0.045, [170, 178, 186]);
  g.rect(w * 0.40, fy - h * 0.235, w * 0.20, h * 0.028, [150, 158, 168]); // dome struts deck
  g.poly([[w * 0.415, fy - h * 0.235], [w * 0.435, fy - h * 0.30], [w * 0.565, fy - h * 0.30], [w * 0.585, fy - h * 0.235]], [236, 240, 244]); // the dome
  for (let i = 0; i < 6; i++) g.disc(w * (0.26 + i * 0.075), fy - h * 0.035, 3, [90, 110, 130]); // windows
  g.ring(w * 0.50, fy - h * 0.13, h * 0.30, [250, 250, 250], 2, 0.35); // radar sweep
  g.ring(w * 0.50, fy - h * 0.13, h * 0.44, [250, 250, 250], 2, 0.2);
  // the intruding drone, small, beyond the line
  const dx = w * 0.925, dy = h * 0.30;
  g.rect(dx - w * 0.018, dy - h * 0.02, w * 0.036, h * 0.04, [60, 62, 68]);
  g.line(dx - w * 0.05, dy - h * 0.045, dx + w * 0.05, dy + h * 0.045, [60, 62, 68], 4);
  g.line(dx + w * 0.05, dy - h * 0.045, dx - w * 0.05, dy + h * 0.045, [60, 62, 68], 4);
  g.disc(dx, dy, 3, [214, 60, 50]);
  // fields below
  g.rect(0, h * 0.86, w, h * 0.14, [128, 156, 96]);
  g.rect(0, h * 0.86, w * 0.4, h * 0.14, [168, 150, 84]);
};

const sceneIowa: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [206, 214, 220], [226, 228, 224]);
  g.rect(0, h * 0.84, w, h * 0.16, [168, 164, 152]); // yard concrete
  // three hazard barrels behind a barrier
  for (let i = 0; i < 3; i++) {
    const bx = w * (0.10 + i * 0.17), by = h * 0.34, bw = w * 0.13, bh = h * 0.42;
    g.rect(bx, by, bw, bh, [188, 172, 60]);
    g.rect(bx, by + bh * 0.3, bw, h * 0.03, [60, 58, 52]);
    g.rect(bx, by + bh * 0.62, bw, h * 0.03, [60, 58, 52]);
    g.poly([[bx + bw * 0.5, by + bh * 0.38], [bx + bw * 0.72, by + bh * 0.56], [bx + bw * 0.28, by + bh * 0.56]], [40, 38, 34]); // hazard diamond-ish
  }
  // barrier across the front
  g.rect(w * 0.04, h * 0.66, w * 0.92, h * 0.075, [238, 240, 242]);
  for (let i = 0; i < 6; i++) g.poly([[w * (0.05 + i * 0.15), h * 0.66], [w * (0.11 + i * 0.15), h * 0.66], [w * (0.08 + i * 0.15), h * 0.735], [w * (0.02 + i * 0.15), h * 0.735]], [216, 84, 40]);
  g.rect(w * 0.06, h * 0.735, w * 0.035, h * 0.11, [90, 88, 84]);
  g.rect(w * 0.905, h * 0.735, w * 0.035, h * 0.11, [90, 88, 84]);
  // STOP sign on a pole, right
  const sx = w * 0.80, sy = h * 0.16;
  g.line(sx, sy + h * 0.10, sx, h * 0.66, [110, 108, 102], 4);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; pts.push([sx + Math.cos(a) * w * 0.085, sy + Math.sin(a) * h * 0.115]); }
  g.poly(pts, [196, 44, 38]);
  // caution tape, sagging
  for (let x = 0; x <= 20; x++) {
    const t = x / 20, y = h * (0.24 + Math.sin(t * Math.PI) * 0.045);
    g.set(w * (0.06 + t * 0.6), y, [240, 200, 60], 0.9);
    g.set(w * (0.06 + t * 0.6), y + 2, [240, 200, 60], 0.9);
  }
};

const sceneQuake: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [64, 130, 168], [30, 84, 120]); // Pacific
  // island silhouette with palms
  g.poly([[w * 0.06, h * 0.60], [w * 0.22, h * 0.48], [w * 0.44, h * 0.46], [w * 0.60, h * 0.54], [w * 0.66, h * 0.60]], [52, 96, 62]);
  for (const fx of [0.28, 0.44]) {
    g.line(w * fx, h * 0.50, w * fx, h * 0.34, [70, 54, 38], 4);
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.18); g.line(w * fx, h * 0.34, w * fx + Math.cos(a) * w * 0.075, h * 0.34 - Math.sin(a) * h * 0.07, [44, 104, 58], 3); }
  }
  // wave bands
  for (let r = 0; r < 3; r++) g.rect(0, h * (0.66 + r * 0.09), w, 3, [140, 200, 220], 0.5);
  // epicentre rings on the water
  for (const rr of [0.05, 0.10, 0.15]) g.ring(w * 0.80, h * 0.66, h * rr, [250, 250, 250], 3, 0.75 - rr);
  g.disc(w * 0.80, h * 0.66, 4, [250, 120, 90]);
  // seismograph drum + trace, foreground
  g.rect(w * 0.05, h * 0.76, w * 0.52, h * 0.18, [238, 236, 228]);
  g.rect(w * 0.05, h * 0.76, w * 0.52, h * 0.18, [238, 236, 228]);
  let px = w * 0.07, py = h * 0.85;
  for (let i = 1; i <= 24; i++) {
    const nx = w * (0.07 + i * 0.02);
    const amp = i < 8 ? 0.008 : i < 14 ? 0.055 : 0.02;
    const ny = h * (0.85 + Math.sin(i * 2.7) * amp);
    g.line(px, py, nx, ny, [196, 44, 38], 2.5);
    px = nx; py = ny;
  }
  g.rect(w * 0.60, h * 0.78, w * 0.10, h * 0.14, [52, 56, 62]); // recorder box
};

const sceneCobalt: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [216, 196, 160], [228, 210, 178]); // dry-season light
  // terraced open pit
  const tiers: Array<[number, RGB]> = [[0.30, [206, 168, 116]], [0.44, [190, 148, 96]], [0.58, [172, 128, 78]], [0.72, [152, 108, 60]], [0.86, [134, 92, 46]]];
  let inset = 0.03;
  for (const [fy, col] of tiers) { g.rect(w * inset, h * fy, w * (1 - inset * 2), h * 0.145, col); inset += 0.055; }
  // haul road zig-zag
  g.line(w * 0.10, h * 0.32, w * 0.55, h * 0.46, [238, 226, 196], 5);
  g.line(w * 0.55, h * 0.46, w * 0.22, h * 0.60, [238, 226, 196], 5);
  g.line(w * 0.22, h * 0.60, w * 0.62, h * 0.74, [238, 226, 196], 5);
  // a parked haul truck
  g.rect(w * 0.60, h * 0.66, w * 0.15, h * 0.07, [232, 176, 52]);
  g.rect(w * 0.715, h * 0.615, w * 0.045, h * 0.05, [60, 60, 64]);
  g.disc(w * 0.635, h * 0.745, h * 0.032, [40, 40, 44]);
  g.disc(w * 0.715, h * 0.745, h * 0.032, [40, 40, 44]);
  // cobalt-blue ore chunks in the pit bottom
  for (const [fx, fy] of [[0.40, 0.90], [0.47, 0.925], [0.54, 0.895], [0.60, 0.925]] as Array<[number, number]>)
    g.poly([[w * fx, h * fy], [w * (fx + 0.025), h * (fy - 0.035)], [w * (fx + 0.055), h * fy]], [52, 92, 196]);
  // barrier gate across the front, closed
  g.rect(w * 0.03, h * 0.80, w * 0.94, h * 0.045, [238, 240, 242]);
  for (let i = 0; i < 6; i++) g.rect(w * (0.05 + i * 0.155), h * 0.80, w * 0.07, h * 0.045, [216, 84, 40]);
  g.rect(w * 0.05, h * 0.845, w * 0.03, h * 0.10, [80, 76, 70]);
  g.rect(w * 0.92, h * 0.845, w * 0.03, h * 0.10, [80, 76, 70]);
};

const sceneDymer: Painter = (g) => {
  const w = g.w, h = g.h;
  g.vgrad(0, 0, w, h, [150, 158, 168], [188, 190, 192]); // grey morning
  const base = h * 0.86;
  // five-storey block; the middle section has fallen
  g.rect(w * 0.05, base - h * 0.56, w * 0.30, h * 0.56, [172, 164, 152]);
  windows(g, w * 0.075, base - h * 0.51, 3, 5, w * 0.055, h * 0.06, w * 0.025, [96, 100, 108], 0.85);
  g.rect(w * 0.66, base - h * 0.56, w * 0.29, h * 0.56, [166, 158, 146]);
  windows(g, w * 0.685, base - h * 0.51, 3, 5, w * 0.055, h * 0.06, w * 0.025, [96, 100, 108], 0.85);
  // the collapsed middle: jagged edges + slumped floors
  g.poly([[w * 0.35, base - h * 0.56], [w * 0.42, base - h * 0.44], [w * 0.38, base - h * 0.34], [w * 0.44, base - h * 0.22], [w * 0.35, base]], [150, 142, 130]);
  g.poly([[w * 0.66, base - h * 0.56], [w * 0.58, base - h * 0.42], [w * 0.63, base - h * 0.30], [w * 0.57, base - h * 0.18], [w * 0.66, base]], [144, 136, 124]);
  for (let i = 0; i < 4; i++) g.line(w * 0.40, base - h * (0.14 + i * 0.09), w * 0.60, base - h * (0.20 + i * 0.09), [120, 112, 100], 5);
  // rubble mound
  g.poly([[w * 0.33, base], [w * 0.50, base - h * 0.15], [w * 0.67, base]], [128, 120, 108]);
  for (let i = 0; i < 7; i++) g.rect(w * (0.37 + i * 0.04), base - h * (0.03 + (i % 3) * 0.025), w * 0.03, h * 0.025, [104, 96, 86]);
  // crane reaching over
  g.line(w * 0.90, base, w * 0.90, base - h * 0.78, [232, 176, 52], 6);
  g.line(w * 0.90, base - h * 0.78, w * 0.52, base - h * 0.78, [232, 176, 52], 6);
  g.line(w * 0.90, base - h * 0.78, w * 0.97, base, [200, 150, 44], 3);
  g.line(w * 0.56, base - h * 0.78, w * 0.56, base - h * 0.52, [70, 68, 64], 3);
  g.rect(w * 0.53, base - h * 0.52, w * 0.06, h * 0.035, [90, 88, 84]);
  // rescue tent, small orange, bottom left
  g.poly([[w * 0.06, base], [w * 0.115, base - h * 0.10], [w * 0.17, base]], [232, 120, 40]);
  g.rect(0, base, w, h - base, [140, 136, 128]);
};

const SCENES: Record<string, Painter> = {
  nvidia: sceneNvidia, puigdemont: scenePuigdemont, grok: sceneGrok,
  sanctions: sceneSanctions, fire: sceneFire, gaza: sceneGaza,
  merger: sceneMerger, ahmadi: sceneAhmadi, stadium: sceneStadium,
  screening: sceneScreening, awacs: sceneAwacs, iowa: sceneIowa,
  quake: sceneQuake, cobalt: sceneCobalt, dymer: sceneDymer,
};

// Fact figures live ON their scenes, where a natural display exists.
function factOverlay(p: Pictured, x: number, y: number, w: number, h: number) {
  if (!p.fact) return;
  if (p.scene === "nvidia") drawText(frame, "sansB42", p.fact, x + w * 0.60, y + h * 0.30, [140, 240, 170]);
  else if (p.scene === "stadium" && h >= 90) drawTextC(frame, "sansB42", p.fact, x + w / 2, y + h * 0.335, [250, 226, 120]);
  // quake: the headline carries M6.5; an overlay collides with the rings.
}

// ---------- the big world map ----------
type LonLat = [number, number];
const LAND: LonLat[][] = [
  // North America
  [[-168, 66], [-158, 71], [-140, 70], [-125, 71], [-115, 69], [-95, 69], [-85, 66], [-80, 73], [-78, 62], [-82, 55], [-76, 50], [-70, 46], [-66, 44], [-70, 42], [-74, 39], [-76, 35], [-75, 32], [-80, 27], [-81, 25], [-84, 28], [-85, 21], [-87, 16], [-90, 14], [-95, 16], [-97, 16], [-102, 18], [-105, 20], [-108, 23], [-110, 24], [-113, 29], [-117, 33], [-121, 35], [-124, 40], [-124, 46], [-128, 52], [-135, 58], [-150, 60], [-162, 61]],
  // South America
  [[-77, 7], [-72, 11], [-64, 10], [-55, 6], [-50, 0], [-44, -3], [-38, -7], [-40, -13], [-41, -22], [-48, -27], [-52, -33], [-57, -39], [-62, -42], [-65, -47], [-67, -52], [-70, -54], [-73, -50], [-73, -44], [-73, -37], [-71, -30], [-70, -20], [-75, -15], [-79, -8], [-80, -4], [-78, 1]],
  // Africa
  [[-6, 35], [0, 36], [10, 37], [11, 34], [20, 32], [30, 31], [34, 28], [35, 24], [38, 21], [40, 15], [43, 12], [48, 11], [51, 12], [44, 5], [42, -2], [40, -10], [40, -16], [36, -22], [33, -27], [28, -33], [20, -35], [17, -32], [15, -27], [13, -18], [12, -12], [13, -6], [9, -1], [9, 4], [4, 6], [-3, 5], [-8, 5], [-13, 8], [-16, 12], [-17, 16], [-16, 21], [-14, 24], [-10, 29]],
  // Eurasia
  [[-9, 43], [-9, 48], [-2, 49], [0, 51], [3, 53], [7, 54], [8, 56], [10, 58], [5, 59], [5, 61], [10, 64], [14, 67], [20, 69], [28, 71], [35, 66], [45, 64], [55, 68], [70, 71], [85, 72], [100, 76], [115, 73], [130, 72], [150, 70], [170, 66], [178, 65], [162, 60], [158, 53], [150, 50], [142, 50], [140, 45], [135, 44], [128, 42], [122, 40], [120, 35], [122, 31], [118, 28], [110, 25], [108, 20], [106, 9], [103, 6], [100, 8], [98, 12], [94, 16], [90, 22], [86, 20], [80, 15], [77, 8], [74, 12], [72, 19], [68, 23], [66, 25], [61, 25], [56, 27], [52, 26], [50, 29], [48, 30], [50, 25], [55, 25], [58, 23], [59, 22], [57, 19], [55, 17], [53, 16], [45, 12], [43, 12], [40, 15], [38, 20], [35, 23], [34, 28], [33, 31], [36, 36], [30, 36], [27, 37], [23, 36], [22, 37], [19, 40], [15, 40], [16, 42], [13, 45], [10, 44], [8, 44], [6, 43], [3, 42], [0, 39], [-1, 37], [-2, 37], [-6, 36], [-9, 37], [-9, 40]],
  // Britain, Ireland, Japan
  [[-5, 50], [-1, 51], [1, 52], [0, 54], [-2, 57], [-4, 58], [-6, 56], [-5, 53], [-3, 51]],
  [[-10, 52], [-6, 52], [-6, 55], [-8, 55], [-10, 54]],
  [[129, 31], [132, 33], [136, 34], [139, 35], [141, 38], [142, 42], [141, 45], [139, 41], [137, 37], [133, 34], [130, 32]],
  // SE Asia islands
  [[95, 5], [100, 0], [104, -3], [106, -6], [102, -4], [97, 2]],
  [[109, 1], [113, 4], [117, 6], [119, 2], [117, -2], [113, -3], [110, -2]],
  [[131, -1], [136, -2], [141, -3], [146, -6], [150, -9], [147, -9], [142, -8], [136, -4], [132, -3]],
  // Australia + New Zealand
  [[113, -22], [114, -28], [115, -33], [118, -35], [124, -33], [130, -32], [133, -32], [136, -35], [139, -37], [141, -38], [146, -39], [149, -38], [150, -37], [153, -32], [153, -27], [150, -22], [146, -19], [143, -14], [142, -11], [141, -13], [140, -18], [136, -15], [135, -12], [132, -11], [129, -14], [126, -14], [122, -17], [118, -20]],
  [[167, -45], [171, -42], [173, -40], [175, -37], [176, -38], [174, -41], [171, -44], [168, -46]],
];
const MAPX = 14, MAPY = 856, MAPW = 506, MAPH = 116;
function proj(lon: number, lat: number, s: number): [number, number] {
  return [((lon + 168) / 360) * MAPW * s, ((82 - lat) / 137) * MAPH * s];
}
function drawMap() {
  const s = 2;
  const g = new Buf(MAPW * s, MAPH * s, [168, 188, 200]);
  for (let lon = -150; lon <= 180; lon += 30) { const [x] = proj(lon, 0, s); g.line(x, 0, x, MAPH * s, [188, 204, 214], 1); }
  for (let lat = -60; lat <= 60; lat += 30) { const [, y] = proj(0, lat, s); g.line(0, y, MAPW * s, y, [188, 204, 214], 1); }
  for (const poly of LAND) g.poly(poly.map(([lo, la]) => proj(lo, la, s)), [206, 198, 170]);
  frame.blitDown(g, MAPX, MAPY);
  frame.rect(MAPX, MAPY, MAPW, 1, [120, 116, 104]);
  frame.rect(MAPX, MAPY + MAPH - 1, MAPW, 1, [120, 116, 104]);
  // numbered pins for the pictured stories; crowded clusters fan out
  // onto leader lines so every number stays readable
  const PIN_OFF: Record<number, [number, number]> = {
    2: [2, 14], 3: [10, 2], 4: [14, -4], 6: [8, 10], 7: [-10, 8],
    9: [-14, -6], 10: [0, -14], 11: [-6, -12], 12: [6, -6], 15: [10, -10],
  };
  for (const p of [...LEADS, ...CARDS]) {
    const [fx, fy] = proj(p.pin[0], p.pin[1], 1);
    const tx = MAPX + fx, ty = MAPY + fy;
    const off = PIN_OFF[p.n] ?? [0, 0];
    const cx = tx + off[0], cy = ty + off[1];
    if (off[0] !== 0 || off[1] !== 0) {
      frame.line(tx, ty, cx, cy, [250, 248, 240], 1.5);
      frame.disc(tx, ty, 2.5, REGION_COLORS[p.region]);
    }
    const r = p.n < 10 ? 9 : 11;
    frame.disc(cx, cy, r, REGION_COLORS[p.region]);
    frame.ring(cx, cy, r, [250, 248, 240], 2);
    drawTextC(frame, "sansB11", String(p.n), cx, cy + 4, [255, 255, 255]);
  }
}

// ---------- page composition ----------
const NAVY: RGB = [22, 40, 63];
const PAPER_LINE: RGB = [198, 190, 170];
const GREY: RGB = [96, 94, 86];
const CARD_BG: RGB = [253, 251, 246];
const TAGC: Record<string, RGB> = { CONFIRMED: [24, 96, 56], REPORTED: [178, 122, 18], CLAIM: [176, 44, 38] };

function cardBox(x: number, y: number, w: number, h: number) {
  frame.rect(x, y, w, h, CARD_BG);
  frame.rect(x, y, w, 1, PAPER_LINE); frame.rect(x, y + h - 1, w, 1, PAPER_LINE);
  frame.rect(x, y, 1, h, PAPER_LINE); frame.rect(x + w - 1, y, 1, h, PAPER_LINE);
}
function paintScene(p: Pictured, x: number, y: number, w: number, h: number) {
  const g = new Buf(w * 2, h * 2, [255, 255, 255]);
  SCENES[p.scene](g);
  frame.blitDown(g, x, y);
  factOverlay(p, x, y, w, h);
}
function chipAndTags(p: Pictured, tx: number, rightX: number, baseY: number, big: boolean) {
  const col = REGION_COLORS[p.region];
  const sty = big ? "sansB11" : "sansB9";
  frame.rect(tx, baseY - (big ? 13 : 11), big ? 17 : 15, big ? 15 : 13, col);
  drawTextC(frame, sty, String(p.n), tx + (big ? 8.5 : 7.5), baseY - 1, [255, 255, 255]);
  drawText(frame, sty, p.regionLabel, tx + (big ? 22 : 19), baseY, INK);
  const src = " · " + p.source;
  const wSrc = textW(sty, src);
  drawText(frame, sty, src, rightX - wSrc, baseY, GREY);
  drawTextR(frame, sty, p.tag, rightX - wSrc, baseY, TAGC[p.tag] ?? INK);
}
function leadCard(p: Pictured, x: number, y: number) {
  const w = 324;
  cardBox(x, y, w, 210);
  paintScene(p, x + 6, y + 6, 312, 94);
  chipAndTags(p, x + 8, x + w - 8, y + 118, true);
  const heads = wrap("serif23", p.headline, 306);
  heads.forEach((ln, i) => drawText(frame, "serif23", ln, x + 8, y + 144 + i * 24, INK));
  if (heads.length > 2) console.error("LEAD HEADLINE OVERFLOW", p.n, heads.length);
  const briefs = wrap("serif14", p.brief, 306);
  briefs.forEach((ln, i) => drawText(frame, "serif14", ln, x + 8, y + 140 + heads.length * 24 + i * 16, INK));
  if (briefs.length > 2) console.error("LEAD BRIEF OVERFLOW", p.n, briefs.length);
}
function gridCard(p: Pictured, x: number, y: number) {
  const w = 324;
  cardBox(x, y, w, 89);
  paintScene(p, x + 5, y + 5, 108, 79);
  const tx = x + 121, tw = w - 121 - 6;
  chipAndTags(p, tx, x + w - 6, y + 14, false);
  const heads = wrap("serif19", p.headline, tw);
  heads.forEach((ln, i) => drawText(frame, "serif19", ln, tx, y + 34 + i * 19, INK));
  if (heads.length > 2) console.error("CARD HEADLINE OVERFLOW", p.n, heads.length);
  const briefs = wrap("serif14", p.brief, tw);
  briefs.forEach((ln, i) => drawText(frame, "serif14", ln, tx, y + 69 + i * 15, INK));
  if (briefs.length > 2) console.error("CARD BRIEF OVERFLOW", p.n, briefs.length);
}

function composePage() {
  // masthead
  frame.rect(0, 0, W, 88, NAVY);
  drawText(frame, "serif19", "THE WORLD IN ONE PAGE", 16, 27, [245, 244, 238]);
  drawTextR(frame, "serif19", "Original illustrations · Wire-verified", 1008, 27, [245, 244, 238]);
  drawTextC(frame, "serif54", "Monday 23 November 2026", 512, 74, [250, 249, 244]);
  frame.rect(0, 88, 341, 5, NAVY); frame.rect(341, 88, 342, 5, [196, 150, 40]); frame.rect(683, 88, 341, 5, [176, 44, 38]);
  drawText(frame, "serif19", "All the day's verified news, drawn and set on one page", 14, 113, INK);
  drawTextR(frame, "sansB11", "43 STORIES · 15 PICTURED · EVERY FACT CHECKED", 1010, 111, [176, 44, 38]);
  frame.rect(14, 118, 996, 1, PAPER_LINE);
  // THE DAY IN UTC
  drawText(frame, "sansB11", "THE DAY IN UTC", 14, 136, NAVY);
  UTC_STRIP.forEach(([t, txt], i) => {
    const cx = [128, 350, 572, 794][i % 4], by = 133 + Math.floor(i / 4) * 16;
    drawText(frame, "sansB11", t, cx, by, NAVY);
    drawText(frame, "sans11", txt, cx + textW("sansB11", t) + 6, by, INK);
  });
  frame.rect(14, 156, 996, 1, PAPER_LINE);
  // leads + grid
  LEADS.forEach((p, i) => leadCard(p, [14, 350, 686][i], 162));
  CARDS.forEach((p, i) => gridCard(p, [14, 350, 686][i % 3], 380 + Math.floor(i / 3) * 92));
  // DATE CHECK
  drawText(frame, "sansB11", "DATE CHECK — big stories NOT on this page, with their real dates", 14, 760, NAVY);
  DATE_CHECK.forEach((s, i) => {
    const cx = [14, 352, 690][i % 3], by = 776 + Math.floor(i / 3) * 10.5;
    drawText(frame, "sans9", s, cx, by, INK);
  });
  drawText(frame, "sans9", NOT_YET, 14, 834, GREY);
  // bottom band: map + briefs
  drawText(frame, "sansB11", "WHERE THE PICTURES ARE — pins match the numbered stories", 14, 850, NAVY);
  drawText(frame, "sansB11", "THE REST OF THE DAY — 28 MORE STORIES", 534, 850, NAVY);
  drawMap();
  // legend: coloured region counts under the map
  const keyOf: Record<string, string> = { "Europe": "europe", "Americas": "americas", "Middle East": "mideast", "Asia-Pacific": "asia", "Global": "global", "Africa": "africa", "Oceania": "oceania" };
  let lx = 14;
  for (const seg of REGION_BAR.split(" · ")) {
    const name = seg.replace(/ \d+$/, "");
    frame.rect(lx, 980, 7, 7, REGION_COLORS[keyOf[name]] ?? INK);
    drawText(frame, "sans9", seg, lx + 10, 988, INK);
    lx += 10 + textW("sans9", seg) + 13;
  }
  // the brief column
  BRIEFS.forEach(([label, region, txt], i) => {
    const cx = i % 2 === 0 ? 534 : 774, by = 868 + Math.floor(i / 2) * 10.6;
    drawText(frame, "sansB9", label, cx, by, REGION_COLORS[region] ?? INK);
    drawText(frame, "sans9", " — " + txt, cx + textW("sansB9", label), by, INK);
  });
  // footer
  frame.rect(14, 1012, 996, 1, PAPER_LINE);
  drawTextC(frame, "sans9", "Sources: Reuters · AP · BBC · Sky News · USGS · Premier League · Oxfam — all times UTC · Illustrations drawn in code for this page", 512, 1022, GREY);
}

// ---------- main ----------
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
if (process.env.SHEET) {
  const sheet = new Buf(660, 1300, [255, 255, 255]);
  const put = (name: string, x: number, y: number, w: number, h: number) => {
    const g = new Buf(w * 2, h * 2, [255, 255, 255]);
    SCENES[name](g);
    sheet.blitDown(g, x, y);
  };
  put("nvidia", 10, 10, 640, 193);
  put("puigdemont", 10, 213, 640, 193);
  put("grok", 10, 416, 640, 193);
  put("sanctions", 10, 619, 460, 328);
  put("fire", 10, 957, 460, 328);
  writeFileSync(outDir + "/sheet.png", encodePNG(sheet));
  console.log("sheet written");
} else {
  composePage();
  writeFileSync(outDir + "/entry.png", encodePNG(frame));
  console.log("entry written");
}
