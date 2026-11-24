/* THE WORLD IN ONE DAY — Monday 23 November 2026.
   Engine v3 pattern, written fresh for this edition: scenes are painted on a
   2x supersampled buffer and downsampled, and EVERY letter is blitted 1:1 from
   a FreeType glyph atlas (atlas.dat) — no letter is ever drawn as a filled
   outline. Node stdlib only, no network, deterministic: writes /output/entry.png. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PAPER, CARD, INK, FAINT, HAIR, NAVY, TEAL, RUST, GOLD, MOSS, PLUM, SKY, CREAM,
  TAGC, REGC, LEADS, CARDS, REST, STRIP, DATECHECK, NOTYET, LAND, PINS,
  REGION_OF, REGION_COUNTS,
} from './data.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 1024, SS = 2, SW = PAGE * SS;

/* ---------------- glyph atlas ---------------- */
const blob = readFileSync(HERE + '/atlas.dat');
const hlen = blob.readUInt32BE(0);
const ATLAS = JSON.parse(blob.toString('utf8', 4, 4 + hlen));
const ALPHA = inflateSync(blob.subarray(4 + hlen));
const AW = ATLAS.width;
function glyph(style, ch) {
  const s = ATLAS.styles[style];
  const g = s && s.glyphs[ch];
  if (!g) return null;
  return { x: g[0], y: g[1], w: g[2], h: g[3], dx: g[4], dy: g[5], adv: g[6] };
}
export function textWidth(text, style, track = 0) {
  let w = 0;
  for (const ch of text) { const g = glyph(style, ch); if (g) w += g.adv + track; }
  return w - (text.length ? track : 0);
}
export function wrap(text, style, maxW, track = 0) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const trial = cur ? cur + ' ' + word : word;
    if (cur && textWidth(trial, style, track) > maxW) { lines.push(cur); cur = word; }
    else cur = trial;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ---------------- scene buffer (2x) ---------------- */
const scene = new Uint8Array(SW * SW * 3);
let clipX = 0, clipY = 0, clipW = SW, clipH = SW;
function setClip(x, y, w, h) { clipX = x * SS; clipY = y * SS; clipW = w * SS; clipH = h * SS; }
function fullClip() { clipX = 0; clipY = 0; clipW = SW; clipH = SW; }
function sset(px, py, c) {
  if (px < clipX || py < clipY || px >= clipX + clipW || py >= clipY + clipH || px < 0 || py < 0 || px >= SW || py >= SW) return;
  const i = (py * SW + px) * 3;
  scene[i] = c[0]; scene[i + 1] = c[1]; scene[i + 2] = c[2];
}
export function shade(c, f) {
  return [Math.min(255, Math.round(c[0] * f)), Math.min(255, Math.round(c[1] * f)), Math.min(255, Math.round(c[2] * f))];
}
export function mix(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
export function sRect(x, y, w, h, c) {
  const x0 = Math.round(x * SS), y0 = Math.round(y * SS), x1 = Math.round((x + w) * SS), y1 = Math.round((y + h) * SS);
  for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) sset(px, py, c);
}
export function sGradV(x, y, w, h, cTop, cBot) {
  const y0 = Math.round(y * SS), y1 = Math.round((y + h) * SS);
  for (let py = y0; py < y1; py++) {
    const t = (py - y0) / Math.max(1, y1 - y0);
    sRect(x, py / SS, w, 1 / SS + 0.01, mix(cTop, cBot, t));
  }
}
export function sPoly(pts, c) {
  const P = pts.map(p => [p[0] * SS, p[1] * SS]);
  let minY = 1e9, maxY = -1e9;
  for (const p of P) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(SW - 1, Math.ceil(maxY));
  for (let py = y0; py <= y1; py++) {
    const yc = py + 0.5, xs = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
      for (let px = xa; px <= xb; px++) sset(px, py, c);
    }
  }
}
export function sDisc(cx, cy, r, c) { sEllipse(cx, cy, r, r, c); }
export function sEllipse(cx, cy, rx, ry, c) {
  const x0 = Math.floor((cx - rx) * SS), x1 = Math.ceil((cx + rx) * SS);
  const y0 = Math.floor((cy - ry) * SS), y1 = Math.ceil((cy + ry) * SS);
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dx = (px + 0.5) / SS - cx, dy = (py + 0.5) / SS - cy;
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) sset(px, py, c);
  }
}
export function sLine(x1, y1, x2, y2, wdt, c) {
  const minx = Math.min(x1, x2) - wdt, maxx = Math.max(x1, x2) + wdt;
  const miny = Math.min(y1, y2) - wdt, maxy = Math.max(y1, y2) + wdt;
  const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
  for (let py = Math.floor(miny * SS); py <= Math.ceil(maxy * SS); py++) for (let px = Math.floor(minx * SS); px <= Math.ceil(maxx * SS); px++) {
    const X = (px + 0.5) / SS, Y = (py + 0.5) / SS;
    let t = ((X - x1) * dx + (Y - y1) * dy) / L2; t = Math.max(0, Math.min(1, t));
    const ex = x1 + t * dx - X, ey = y1 + t * dy - Y;
    if (ex * ex + ey * ey <= (wdt / 2) * (wdt / 2)) sset(px, py, c);
  }
}
export function sRing(cx, cy, r, wdt, c) {
  const x0 = Math.floor((cx - r - wdt) * SS), x1 = Math.ceil((cx + r + wdt) * SS);
  const y0 = Math.floor((cy - r - wdt) * SS), y1 = Math.ceil((cy + r + wdt) * SS);
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dx = (px + 0.5) / SS - cx, dy = (py + 0.5) / SS - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (Math.abs(d - r) <= wdt / 2) sset(px, py, c);
  }
}

/* ---------------- frame (1x) + text blitting ---------------- */
const frame = new Uint8Array(PAGE * PAGE * 3);
function downsample() {
  for (let y = 0; y < PAGE; y++) for (let x = 0; x < PAGE; x++) {
    let r = 0, g = 0, b = 0;
    for (let oy = 0; oy < SS; oy++) for (let ox = 0; ox < SS; ox++) {
      const i = ((y * SS + oy) * SW + x * SS + ox) * 3;
      r += scene[i]; g += scene[i + 1]; b += scene[i + 2];
    }
    const j = (y * PAGE + x) * 3, n = SS * SS;
    frame[j] = r / n; frame[j + 1] = g / n; frame[j + 2] = b / n;
  }
}
export function drawText(text, x, baseline, style, color, track = 0) {
  let pen = x;
  for (const ch of text) {
    const g = glyph(style, ch);
    if (!g) continue;
    if (g.w > 0) {
      const dx0 = Math.round(pen + g.dx), dy0 = Math.round(baseline + g.dy);
      for (let gy = 0; gy < g.h; gy++) {
        const fy = dy0 + gy; if (fy < 0 || fy >= PAGE) continue;
        for (let gx = 0; gx < g.w; gx++) {
          const fx = dx0 + gx; if (fx < 0 || fx >= PAGE) continue;
          const a = ALPHA[(g.y + gy) * AW + g.x + gx];
          if (!a) continue;
          const j = (fy * PAGE + fx) * 3, ia = 255 - a;
          frame[j] = (color[0] * a + frame[j] * ia) / 255;
          frame[j + 1] = (color[1] * a + frame[j + 1] * ia) / 255;
          frame[j + 2] = (color[2] * a + frame[j + 2] * ia) / 255;
        }
      }
    }
    pen += g.adv + track;
  }
  return pen - x;
}
export function drawTextC(text, cx, baseline, style, color, track = 0) {
  return drawText(text, cx - textWidth(text, style, track) / 2, baseline, style, color, track);
}
export function drawTextR(text, xr, baseline, style, color, track = 0) {
  return drawText(text, xr - textWidth(text, style, track), baseline, style, color, track);
}

/* ---------------- PNG encode ---------------- */
const CRC_T = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; }
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC_T[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG() {
  const raw = Buffer.alloc(PAGE * (PAGE * 3 + 1));
  for (let y = 0; y < PAGE; y++) {
    raw[y * (PAGE * 3 + 1)] = 0;
    Buffer.from(frame.buffer, y * PAGE * 3, PAGE * 3).copy(raw, y * (PAGE * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PAGE, 0); ihdr.writeUInt32BE(PAGE, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- silhouette scenes ----------------
   Flat editorial duotone: every illustrated card's panel DEPICTS its story.
   Coordinates are page pixels inside the panel (x, y, w, h). */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function skyGrad(x, y, w, h, art) { sGradV(x, y, w, h, mix(art, CREAM, 0.52), mix(art, CREAM, 0.16)); }
function inkOf(art) { return shade(art, 0.38); }
function midOf(art) { return shade(art, 0.62); }
function paleOf(art) { return mix(art, CREAM, 0.62); }

function scSummit(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.82;
  sRect(x, gy, w, h - (gy - y), shade(art, 0.55));
  const bw = w * 0.60, bx = x + (w - bw) / 2, by = gy - h * 0.50;
  sDisc(x + w / 2, by + 5, bw * 0.15, ink);                        // dome
  sRect(x + w / 2 - 1.5, by - h * 0.14, 3, h * 0.15, ink);         // spire
  sPoly([[bx - 6, by + 6], [bx + bw + 6, by + 6], [x + w / 2, by - h * 0.11]], ink); // pediment
  sRect(bx, by + 6, bw, gy - by - 6, mid);                         // hall body
  for (let i = 0; i < 6; i++) {                                    // columns
    const cxp = bx + bw * (0.09 + i * 0.164);
    sRect(cxp, by + 12, bw * 0.05, gy - by - 14, paleOf(art));
  }
  for (let i = 0; i < 8; i++)                                      // window row
    sRect(bx + bw * (0.08 + i * 0.115), gy - h * 0.10, bw * 0.055, h * 0.05, paleOf(art));
  const flagCols = [RUST, GOLD, TEAL, MOSS, PLUM, SKY];
  for (let i = 0; i < 6; i++) {                                    // flag row on the roofline
    const fx = bx + bw * (0.07 + i * 0.165);
    sLine(fx, by + 4, fx, by - h * 0.13, 1.3, paleOf(art));
    sRect(fx, by - h * 0.13, bw * 0.09, h * 0.075, flagCols[i]);
  }
  sRect(x, gy - 2, w, 2, mid);
}
function scChip(x, y, w, h, art) {
  sRect(x, y, w, h, shade(art, 0.30));                             // dark board
  for (let i = 0; i < 5; i++) {                                    // clean circuit traces
    const ty = y + h * (0.10 + i * 0.18);
    sLine(x + w * 0.04, ty, x + w * 0.30, ty, 1.2, midOf(art));
    sDisc(x + w * 0.30, ty, 2, midOf(art));
  }
  for (let i = 0; i < 4; i++) {
    const tx = x + w * (0.72 + i * 0.06);
    sLine(tx, y + h * 0.08, tx, y + h * 0.28, 1.2, midOf(art));
    sDisc(tx, y + h * 0.28, 2, midOf(art));
  }
  const cw = w * 0.50, ch = h * 0.60, cx = x + (w - cw) / 2, cy = y + h * 0.20;
  for (let i = 0; i < 7; i++) {                                    // pins on all sides
    sRect(cx - w * 0.06, cy + ch * (0.08 + i * 0.14), w * 0.06, 2.6, paleOf(art));
    sRect(cx + cw, cy + ch * (0.08 + i * 0.14), w * 0.06, 2.6, paleOf(art));
  }
  for (let i = 0; i < 5; i++) {
    sRect(cx + cw * (0.12 + i * 0.18), cy - h * 0.055, 2.6, h * 0.055, paleOf(art));
    sRect(cx + cw * (0.12 + i * 0.18), cy + ch, 2.6, h * 0.055, paleOf(art));
  }
  sRect(cx, cy, cw, ch, midOf(art));                               // the chip, lighter than the board
  sRect(cx + cw * 0.15, cy + ch * 0.15, cw * 0.70, ch * 0.70, inkOf(art)); // die
  sRect(cx + cw * 0.33, cy + ch * 0.33, cw * 0.34, ch * 0.34, paleOf(art)); // core
  sLine(x + w * 0.70, y + h * 0.88, x + w * 0.86, y + h * 0.72, 4, CREAM); // rising arrow
  sPoly([[x + w * 0.86, y + h * 0.72], [x + w * 0.79, y + h * 0.72], [x + w * 0.79, y + h * 0.64], [x + w * 0.86, y + h * 0.56], [x + w * 0.93, y + h * 0.64], [x + w * 0.93, y + h * 0.72]], CREAM);
}
function scGavel(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.80;
  for (let i = 0; i < 5; i++) {                                    // court columns behind
    const cxp = x + w * (0.08 + i * 0.20);
    sRect(cxp, y + h * 0.18, w * 0.055, gy - y - h * 0.18, mid);
  }
  sRect(x, gy, w, h - (gy - y), shade(art, 0.55));                 // bench
  sLine(x + w * 0.28, y + h * 0.66, x + w * 0.60, y + h * 0.38, 7, paleOf(art)); // gavel handle
  sRect(x + w * 0.55, y + h * 0.28, w * 0.26, h * 0.14, CREAM);     // gavel head
  sRect(x + w * 0.53, y + h * 0.255, w * 0.30, h * 0.045, paleOf(art));
  sEllipse(x + w * 0.42, gy - h * 0.02, w * 0.13, h * 0.05, CREAM); // sound block
  sRect(x + w * 0.31, gy - h * 0.08, w * 0.22, h * 0.06, paleOf(art));
  for (let i = 0; i < 3; i++)                                      // motion lines
    sLine(x + w * (0.68 + i * 0.05), y + h * (0.30 + i * 0.05), x + w * (0.76 + i * 0.05), y + h * (0.26 + i * 0.05), 1.6, CREAM);
}
function scBank(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.84;
  sRect(x, gy, w, h - (gy - y), shade(art, 0.5));
  const bw = w * 0.72, bx = x + (w - bw) / 2, by = gy - h * 0.56;
  sPoly([[bx - 5, by + 5], [bx + bw + 5, by + 5], [x + w / 2, by - h * 0.12]], ink); // pediment
  sDisc(x + w / 2, by - h * 0.02, bw * 0.05, paleOf(art));          // roundel
  sRect(bx, by + 5, bw, gy - by - 5, mid);                          // facade
  for (let i = 0; i < 5; i++) {                                     // columns
    const cxp = bx + bw * (0.10 + i * 0.20);
    sRect(cxp, by + 10, bw * 0.07, gy - by - 12, paleOf(art));
  }
  sRect(bx - w * 0.04, gy - h * 0.06, bw + w * 0.08, h * 0.03, ink); // steps
  sRect(bx - w * 0.07, gy - h * 0.015, bw + w * 0.14, h * 0.03, ink);
  sLine(x + w * 0.50, by - h * 0.12, x + w * 0.50, by - h * 0.26, 1.3, ink); // flag pole
  sRect(x + w * 0.50, by - h * 0.26, w * 0.10, h * 0.075, GOLD);    // flag
  sDisc(x + w * 0.545, by - h * 0.222, 1.6, NAVY);
}
function scFactory(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.86;
  sRect(x, gy, w, h - (gy - y), shade(art, 0.5));
  const bw = w * 0.78, bx = x + w * 0.06, by = gy - h * 0.42;
  sRect(bx, by, bw, h * 0.42, ink);                                // factory body
  sPoly([[bx, by], [bx + bw * 0.25, by - h * 0.12], [bx + bw * 0.50, by], [bx + bw * 0.75, by - h * 0.12], [bx + bw, by]], mid); // sawtooth roof
  for (let i = 0; i < 5; i++)                                       // windows
    sRect(bx + bw * (0.08 + i * 0.18), by + h * 0.16, bw * 0.09, h * 0.10, paleOf(art));
  const sx = x + w * 0.84, sy = gy - h * 0.62;                     // chimney
  sRect(sx, sy, w * 0.07, h * 0.62, mid);
  sRect(sx - 2, sy - 3, w * 0.07 + 4, 4, ink);
  const fx = bx + bw * 0.55, fy = by - h * 0.02;                   // flames on the roof
  sPoly([[fx - 8, fy + 4], [fx - 3, fy - h * 0.14], [fx, fy - h * 0.06], [fx + 4, fy - h * 0.18], [fx + 8, fy + 4]], mix(RUST, GOLD, 0.45));
  sPoly([[fx - 4, fy + 4], [fx, fy - h * 0.09], [fx + 4, fy + 4]], CREAM);
  for (let i = 0; i < 4; i++) sEllipse(fx + 6 + i * 4, fy - h * (0.16 + i * 0.06), 5 + i * 2, 4 + i, mid); // smoke
  for (let i = 0; i < 3; i++) sEllipse(sx + w * 0.035 + i * 3, sy - h * (0.05 + i * 0.05), 4 + i * 1.5, 3 + i, mid);
}
function scGaza(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.86;
  sDisc(x + w * 0.16, y + h * 0.30, h * 0.13, paleOf(art));         // low sun
  sRect(x, gy, w, h - (gy - y), shade(art, 0.5));
  const rnd = rng(55);
  let bx = x + w * 0.02;
  while (bx < x + w * 0.97) {                                       // dense skyline
    const bw = w * (0.05 + rnd() * 0.05), bh = h * (0.28 + rnd() * 0.30);
    sRect(bx, gy - bh, bw, bh, ink);
    bx += bw + w * 0.012;
  }
  const mx = x + w * 0.60;                                          // minaret
  sRect(mx, gy - h * 0.66, w * 0.022, h * 0.66, ink);
  sDisc(mx + w * 0.011, gy - h * 0.68, w * 0.030, ink);
  sLine(mx + w * 0.011, gy - h * 0.71, mx + w * 0.011, gy - h * 0.80, 1.4, ink);
  for (const fx of [0.30, 0.78]) {                                  // smoke columns
    for (let i = 0; i < 5; i++)
      sEllipse(x + w * (fx + Math.sin(i * 1.7) * 0.012), gy - h * (0.52 + i * 0.085), w * (0.030 + i * 0.008), h * (0.045 + i * 0.008), mid);
  }
}
function scChartUp(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.86;
  const rnd = rng(10);
  let bx = x + w * 0.03;
  while (bx < x + w * 0.96) {                                       // skyline
    const bw = w * (0.06 + rnd() * 0.05), bh = h * (0.16 + rnd() * 0.22);
    sRect(bx, gy - bh, bw, bh, ink);
    bx += bw + w * 0.014;
  }
  sRect(x, gy, w, h - (gy - y), shade(art, 0.5));
  const pts = [[0.06, 0.62], [0.28, 0.62], [0.28, 0.46], [0.50, 0.46], [0.50, 0.30], [0.72, 0.30], [0.72, 0.16], [0.88, 0.16]];
  for (let i = 0; i + 1 < pts.length; i++)
    sLine(x + w * pts[i][0], y + h * pts[i][1], x + w * pts[i + 1][0], y + h * pts[i + 1][1], 3, CREAM); // rising steps
  const ex = x + w * 0.88, ey = y + h * 0.16;
  sPoly([[ex, ey - 5], [ex + w * 0.075, ey + 1], [ex + w * 0.028, ey + 2], [ex + w * 0.035, ey + 7], [ex - w * 0.005, ey + 3]], CREAM); // arrowhead
}
function scStage(x, y, w, h, art) {
  sRect(x, y, w, h, shade(art, 0.35));                              // dark stage
  sPoly([[x, y], [x + w * 0.30, y], [x + w * 0.14, y + h], [x, y + h]], midOf(art)); // left curtain
  sPoly([[x + w, y], [x + w * 0.70, y], [x + w * 0.86, y + h], [x + w, y + h]], midOf(art)); // right curtain
  sPoly([[x + w * 0.30, y], [x + w * 0.70, y], [x + w * 0.56, y + h * 0.55], [x + w * 0.44, y + h * 0.55]], mix(CREAM, art, 0.55)); // spotlight cone
  const mx = x + w * 0.50, my = y + h * 0.38;                       // microphone, big and central
  sEllipse(mx, y + h * 0.94, w * 0.20, h * 0.03, paleOf(art));      // light pool on the floor
  sDisc(mx, my, w * 0.085, CREAM);
  sDisc(mx, my, w * 0.062, inkOf(art));
  for (let i = 0; i < 3; i++) sLine(mx - w * 0.082, my - h * 0.03 + i * h * 0.045, mx + w * 0.082, my - h * 0.03 + i * h * 0.045, 1.4, CREAM);
  sLine(mx, my + w * 0.085, mx, y + h * 0.92, 3, paleOf(art));      // stand
  sLine(mx, y + h * 0.92, mx - w * 0.09, y + h * 0.99, 2.4, paleOf(art));
  sLine(mx, y + h * 0.92, mx + w * 0.09, y + h * 0.99, 2.4, paleOf(art));
  sRect(x, y + h * 0.92, w, h * 0.08, shade(art, 0.55));            // stage floor
}
function scStadium(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.80;
  for (const fx of [0.16, 0.84]) {                                  // floodlights
    sLine(x + w * fx, gy - h * 0.30, x + w * fx, y + h * 0.10, 2, ink);
    sRect(x + w * fx - w * 0.045, y + h * 0.045, w * 0.09, h * 0.07, ink);
    for (let i = 0; i < 3; i++) sDisc(x + w * fx - w * 0.028 + i * w * 0.028, y + h * 0.08, 1.8, CREAM);
  }
  sPoly([[x + w * 0.06, gy], [x + w * 0.12, gy - h * 0.34], [x + w * 0.88, gy - h * 0.34], [x + w * 0.94, gy]], ink); // bowl
  sRect(x + w * 0.10, gy - h * 0.40, w * 0.80, h * 0.065, mid);     // roof band
  for (let i = 0; i < 12; i++) sRect(x + w * (0.16 + i * 0.058), gy - h * 0.28, w * 0.03, h * 0.05, paleOf(art)); // crowd lights
  sRect(x, gy, w, h - (gy - y), shade(art, 0.52));                  // pitch
  sLine(x + w * 0.08, gy + h * 0.10, x + w * 0.92, gy + h * 0.10, 1.1, paleOf(art));
  const bx = x + w * 0.76, by = gy + h * 0.085, br = h * 0.105;     // the ball
  sDisc(bx, by, br, CREAM);
  sDisc(bx, by, br * 0.34, ink);
  for (let a = 0; a < 5; a++) sDisc(bx + Math.cos(a * 1.256) * br * 0.68, by + Math.sin(a * 1.256) * br * 0.68, br * 0.20, ink);
}
function scHospital(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.86;
  sRect(x, gy, w, h - (gy - y), shade(art, 0.5));
  const bw = w * 0.56, bx = x + w * 0.22, by = gy - h * 0.58;
  sRect(bx, by, bw, h * 0.58, ink);                                // hospital block
  sRect(bx + bw * 0.30, by - h * 0.16, bw * 0.40, h * 0.16, mid);   // top wing
  for (let r = 0; r < 3; r++) for (let cix = 0; cix < 4; cix++)     // lit windows
    sRect(bx + bw * (0.10 + cix * 0.22), by + h * (0.14 + r * 0.20), bw * 0.11, h * 0.09, paleOf(art));
  const cxp = bx + bw * 0.50, cyp = by - h * 0.08;                 // cross sign
  sRect(cxp - w * 0.015, cyp - h * 0.07, w * 0.03, h * 0.14, CREAM);
  sRect(cxp - w * 0.05, cyp - h * 0.035, w * 0.10, h * 0.07, CREAM);
  sLine(x + w * 0.08, gy - h * 0.10, x + w * 0.92, gy - h * 0.10, 1.2, paleOf(art)); // ribbon line
  sPoly([[x + w * 0.08, gy - h * 0.10], [x + w * 0.16, gy - h * 0.16], [x + w * 0.16, gy - h * 0.04]], RUST); // ribbon end
}
function scRadar(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.84;
  const dx = x + w * 0.28, dy = y + h * 0.52;                       // radar dish
  sLine(dx, dy, dx, gy, 2.4, ink);
  sPoly([[dx - w * 0.16, dy - h * 0.10], [dx + w * 0.16, dy - h * 0.10], [dx, dy + h * 0.10]], mid);
  sLine(dx, dy, dx + w * 0.22, dy - h * 0.22, 1.6, ink);
  sDisc(dx + w * 0.24, dy - h * 0.24, 2.4, paleOf(art));
  for (let i = 0; i < 3; i++) sRing(dx, dy - h * 0.02, w * (0.10 + i * 0.06), 1, paleOf(art)); // sweep rings
  const px = x + w * 0.66, py = y + h * 0.26;                       // the jet, large and cream
  sPoly([[px - w * 0.20, py], [px + w * 0.03, py - h * 0.07], [px + w * 0.20, py], [px + w * 0.03, py + h * 0.07]], CREAM);
  sPoly([[px - w * 0.03, py - h * 0.07], [px + w * 0.08, py - h * 0.19], [px + w * 0.10, py - h * 0.05]], paleOf(art));
  sPoly([[px - w * 0.03, py + h * 0.07], [px + w * 0.08, py + h * 0.19], [px + w * 0.10, py + h * 0.05]], paleOf(art));
  for (let i = 0; i < 3; i++) sLine(px - w * (0.22 + i * 0.07), py, px - w * (0.29 + i * 0.07), py, 1.6, CREAM); // trail
  sRect(x, gy, w, h - (gy - y), shade(art, 0.5));
}
function scBarrels(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.86;
  sRect(x, gy, w, h - (gy - y), shade(art, 0.5));
  const bw = w * 0.16, bh = h * 0.34;
  const spots = [[0.10, 0.52], [0.28, 0.52], [0.46, 0.52], [0.19, 0.20], [0.37, 0.20]];
  for (const [fx, fy] of spots) {                                  // stacked barrels
    const bx = x + w * fx, by = gy - h * fy;
    sRect(bx, by, bw, bh, ink);
    sRect(bx, by + bh * 0.18, bw, 1.6, mid);
    sRect(bx, by + bh * 0.78, bw, 1.6, mid);
  }
  const tx = x + w * 0.78, ty = y + h * 0.30;                      // warning sign
  sPoly([[tx, ty - h * 0.16], [tx + w * 0.14, ty + h * 0.10], [tx - w * 0.14, ty + h * 0.10]], GOLD);
  sPoly([[tx, ty - h * 0.11], [tx + w * 0.095, ty + h * 0.065], [tx - w * 0.095, ty + h * 0.065]], INK);
  sRect(tx - 1.2, ty - h * 0.05, 2.4, h * 0.07, GOLD);
  sDisc(tx, ty + h * 0.045, 1.8, GOLD);
  sLine(tx, ty + h * 0.10, tx, gy, 1.8, ink);                      // sign post
}
function scAndes(x, y, w, h, art) {
  skyGrad(x, y, w, h, art);
  const ink = inkOf(art), mid = midOf(art), gy = y + h * 0.88;
  sPoly([[x, gy], [x, y + h * 0.30], [x + w * 0.16, y + h * 0.16], [x + w * 0.30, y + h * 0.38], [x + w * 0.44, y + h * 0.10], [x + w * 0.58, y + h * 0.34], [x + w * 0.70, y + h * 0.22], [x + w * 0.84, y + h * 0.40], [x + w, y + h * 0.28], [x + w, gy]], mid); // back ridge
  sPoly([[x, gy], [x, y + h * 0.52], [x + w * 0.20, y + h * 0.30], [x + w * 0.38, y + h * 0.55], [x + w * 0.55, y + h * 0.26], [x + w * 0.74, y + h * 0.52], [x + w * 0.88, y + h * 0.38], [x + w, y + h * 0.55], [x + w, gy]], ink); // front ridge
  for (const [px, py] of [[0.20, 0.30], [0.55, 0.26], [0.88, 0.38]]) // snow caps
    sPoly([[x + w * (px - 0.045), py * h + y + h * 0.055], [x + w * px, py * h + y], [x + w * (px + 0.045), py * h + y + h * 0.055], [x + w * (px + 0.014), py * h + y + h * 0.038], [x + w * px, py * h + y + h * 0.062], [x + w * (px - 0.014), py * h + y + h * 0.038]], CREAM);
  sLine(x + w * 0.55, y + h * 0.30, x + w * 0.585, y + h * 0.44, 1.6, shade(art, 0.30)); // crack
  sLine(x + w * 0.585, y + h * 0.44, x + w * 0.555, y + h * 0.58, 1.6, shade(art, 0.30));
  sLine(x + w * 0.585, y + h * 0.44, x + w * 0.625, y + h * 0.55, 1.3, shade(art, 0.30));
  sRing(x + w * 0.30, gy - h * 0.015, w * 0.045, 1.5, CREAM);      // epicentre rings
  sRing(x + w * 0.30, gy - h * 0.015, w * 0.085, 1.2, paleOf(art));
  for (const hx of [0.66, 0.76]) {                                 // houses at the base
    sRect(x + w * hx, gy - h * 0.085, w * 0.07, h * 0.085, ink);
    sPoly([[x + w * (hx - 0.008), gy - h * 0.085], [x + w * (hx + 0.078), gy - h * 0.085], [x + w * (hx + 0.035), gy - h * 0.135]], ink);
  }
}
const SCENES = {
  summit: scSummit, chip: scChip, gavel: scGavel, bank: scBank, factory: scFactory,
  gaza: scGaza, chartup: scChartUp, stage: scStage, stadium: scStadium,
  hospital: scHospital, radar: scRadar, barrels: scBarrels, andes: scAndes,
};
function paintScene(kind, x, y, w, h, art) {
  setClip(x, y, w, h);
  (SCENES[kind] || scSummit)(x, y, w, h, art);
  fullClip();
}

/* ---------------- page layout ---------------- */
const M = 14, RX = 1010;
const STRIPBG = [239, 233, 216];
const BODYTX = [52, 47, 39];

function border(x, y, w, h, c) {
  sRect(x, y, w, 1, c); sRect(x, y + h - 1, w, 1, c); sRect(x, y, 1, h, c); sRect(x + w - 1, y, 1, h, c);
}
function numBadge(n, cx, cy, color) {
  sDisc(cx, cy, 9.5, color);
  sRing(cx, cy, 9.5, 1, CREAM);
}
function numBadgeText(n, cx, cy) { drawTextC(String(n), cx, cy + 3.4, 'sansB9', [255, 255, 255]); }

const leadGeom = { y: 186, h: 258, w: 324, sceneH: 128 };
const gridGeom = { y1: 452, y2: 612, h: 154, w: 191, sceneH: 50 };

function paintFurniture() {
  sRect(0, 0, PAGE, PAGE, PAPER);
  sRect(M, 10, RX - M, 1, INK);
  sRect(M, 90, RX - M, 3, INK); sRect(M, 96, RX - M, 1, INK);
  sRect(M, 116, 300, 1, HAIR); sRect(724, 116, RX - 724, 1, HAIR);
  // UTC strip
  sRect(M, 134, RX - M, 42, STRIPBG);
  sRect(M, 134, RX - M, 1, HAIR); sRect(M, 175, RX - M, 1, HAIR);
  // lead cards
  LEADS.forEach((s, i) => {
    const x = M + i * (leadGeom.w + 12), y = leadGeom.y;
    sRect(x, y, leadGeom.w, leadGeom.h, CARD); border(x, y, leadGeom.w, leadGeom.h, HAIR);
    paintScene(s.scene, x + 2, y + 2, leadGeom.w - 4, leadGeom.sceneH, s.art);
    numBadge(s.n, x + 16, y + 16, TAGC[s.tag]);
    const label = s.tag + ' • ' + s.src;
    sRect(x + 10, y + leadGeom.sceneH + 9, textWidth(label, 'sansB10') + 12, 15, TAGC[s.tag]);
  });
  // grid cards
  CARDS.forEach((s, i) => {
    const row = i < 5 ? 0 : 1, col = i % 5;
    const x = M + col * (gridGeom.w + 10.25), y = row ? gridGeom.y2 : gridGeom.y1;
    sRect(x, y, gridGeom.w, gridGeom.h, CARD); border(x, y, gridGeom.w, gridGeom.h, HAIR);
    paintScene(s.scene, x + 2, y + 2, gridGeom.w - 4, gridGeom.sceneH, s.art);
    numBadge(s.n, x + 13, y + 13, TAGC[s.tag]);
    const label = s.tag + ' • ' + s.src;
    sRect(x + 7, y + gridGeom.sceneH + 6, textWidth(label, 'sansB9') + 10, 13, TAGC[s.tag]);
  });
  // rest band
  sRect(M, 770, RX - M, 1, HAIR);
  REST.forEach((r, i) => {
    const col = i < 11 ? 0 : 1, row = i % 11;
    const x = col ? 519 : M, base = 800 + row * 11;
    sDisc(x + 6, base - 3.2, 6.5, REGC[r[1]]);
  });
  // bottom band: map + region bar
  sRect(M, 914, RX - M, 1, HAIR);
  const mapX = M, mapY = 922, mapW = 296, mapH = 54;
  sRect(mapX, mapY, mapW, mapH, mix(PAPER, SKY, 0.16)); border(mapX, mapY, mapW, mapH, HAIR);
  for (let gx = 2; gx < mapW - 1; gx += 3.6) for (let gy = 2; gy < mapH - 1; gy += 3.6) {
    const lon = (gx / mapW) * 360 - 180, lat = 84 - (gy / mapH) * 146;
    let inside = false;
    for (const poly of LAND) {
      let c = false;
      for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
        const [xa, ya] = poly[a], [xb, yb] = poly[b];
        if ((ya > lat) !== (yb > lat) && lon < (xb - xa) * (lat - ya) / (yb - ya) + xa) c = !c;
      }
      if (c) { inside = true; break; }
    }
    if (inside) sDisc(mapX + gx, mapY + gy, 1.3, mix(INK, PAPER, 0.18));
  }
  const lon2x = lon => mapX + (lon + 180) / 360 * mapW;
  const lat2y = lat => mapY + (84 - lat) / 146 * mapH;
  for (const [n, lon, lat] of PINS) sDisc(lon2x(lon), lat2y(lat), 6.5, REGC[REGION_OF[n]]);
  let bx = mapX; const total = 35;
  for (const [name, count] of REGION_COUNTS) {
    const wdt = mapW * count / total;
    sRect(bx, 980, wdt - 1, 7, REGC[name]);
    bx += wdt;
  }
}

function paintText() {
  drawText('ONE DAY • ONE PAGE • 35 STORIES • 7 REGIONS', M + 2, 24, 'sansB10', FAINT, 1.5);
  drawTextR('MONDAY EDITION', RX - 2, 24, 'sansB10', FAINT, 1.5);
  drawTextC('THE WORLD IN ONE DAY', PAGE / 2, 80, 'serif54', INK, 0.5);
  drawTextC('MONDAY 23 NOVEMBER 2026', PAGE / 2, 124, 'serif23', INK, 1);
  drawText('THE DAY', M + 2, 152, 'sansB10', INK);
  drawText('IN UTC', M + 2, 168, 'sansB10', INK);
  STRIP.forEach((it, i) => {
    const x = 118 + (i % 4) * 223, base = i < 4 ? 152 : 168;
    const tw = drawText(it[0], x, base, 'sansB11', INK);
    drawText(it[1], x + tw + 6, base, 'sans11', BODYTX);
  });
  LEADS.forEach((s, i) => {
    const x = M + i * (leadGeom.w + 12), y = leadGeom.y;
    numBadgeText(s.n, x + 16, y + 16);
    const base = y + 2 + leadGeom.sceneH - 12;
    if (s.factSub) drawText(s.factSub, x + 12, base - 54, 'sansB9', CREAM, 1);
    drawText(s.fact, x + 13, base + 2, 'sansB42', [12, 10, 8]);
    drawText(s.fact, x + 11, base, 'sansB42', CREAM);
    drawText(s.tag + ' • ' + s.src, x + 16, y + leadGeom.sceneH + 20, 'sansB10', [255, 255, 255]);
    drawTextR(s.region.toUpperCase(), x + leadGeom.w - 10, y + leadGeom.sceneH + 20, 'sans10', FAINT, 1);
    const heads = wrap(s.head, 'serif19', leadGeom.w - 20);
    heads.forEach((ln, li) => drawText(ln, x + 10, y + leadGeom.sceneH + 42 + li * 22, 'serif19', INK));
    const briefs = wrap(s.brief, 'sans12', leadGeom.w - 20);
    briefs.forEach((ln, li) => drawText(ln, x + 10, y + leadGeom.sceneH + 46 + heads.length * 22 + li * 15.5, 'sans12', BODYTX));
  });
  CARDS.forEach((s, i) => {
    const row = i < 5 ? 0 : 1, col = i % 5;
    const x = M + col * (gridGeom.w + 10.25), y = row ? gridGeom.y2 : gridGeom.y1;
    numBadgeText(s.n, x + 13, y + 13);
    drawText(s.fact, x + 9, y + gridGeom.sceneH - 6 + 2, 'sansB25', [12, 10, 8]);
    drawText(s.fact, x + 7, y + gridGeom.sceneH - 6, 'sansB25', CREAM);
    drawText(s.tag + ' • ' + s.src, x + 12, y + gridGeom.sceneH + 16, 'sansB9', [255, 255, 255]);
    const chipEnd = x + 7 + textWidth(s.tag + ' • ' + s.src, 'sansB9') + 10;
    const regW = textWidth(s.region.toUpperCase(), 'sans9', 0.5);
    if (chipEnd + 8 < x + gridGeom.w - 7 - regW)
      drawTextR(s.region.toUpperCase(), x + gridGeom.w - 7, y + gridGeom.sceneH + 16, 'sans9', FAINT, 0.5);
    const heads = wrap(s.head, 'serif14', gridGeom.w - 14);
    heads.forEach((ln, li) => drawText(ln, x + 7, y + gridGeom.sceneH + 32 + li * 16.5, 'serif14', INK));
    const briefs = wrap(s.brief, 'sans10', gridGeom.w - 14);
    briefs.forEach((ln, li) => drawText(ln, x + 7, y + gridGeom.sceneH + 32 + heads.length * 16.5 + 2 + li * 11.2, 'sans10', BODYTX));
  });
  drawText('THE REST OF THE DAY — in brief', M + 2, 786, 'sansB11', INK, 0.5);
  REST.forEach((r, i) => {
    const col = i < 11 ? 0 : 1, row = i % 11;
    const x = col ? 519 : M, base = 800 + row * 11;
    drawTextC(String(r[0]), x + 6, base + 0.2, 'sansB9', [255, 255, 255]);
    let cx = drawText(r[2], x + 18, base, 'sansB10', INK);
    drawText(' — ' + r[3], x + 18 + cx, base, 'sans10', BODYTX);
  });
  drawText('DATE CHECK — big stories we left out, with their real dates', 322, 930, 'sansB10', INK, 0.5);
  DATECHECK.forEach((d, i) => {
    const col = i < 7 ? 0 : 1, row = i % 7;
    const x = col ? 676 : 322, base = 946 + row * 10.4;
    let cx = drawText(d[0], x, base, 'sans9', INK);
    cx += drawText(' — ' + d[1], x + cx, base, 'sansB9', RUST);
    drawText(' · ' + d[2], x + cx, base, 'sans9', FAINT);
  });
  drawText('Europe 11 · Americas 10 · Middle East 5 · Asia-Pacific 4', M + 2, 999, 'sans9', BODYTX);
  drawText('Africa 2 · Global 2 · Oceania 1 — bar + pins by region', M + 2, 1010, 'sans9', BODYTX);
  let nx = drawText('NOT YET — after 23 Nov:  ', M + 2, 1020, 'sansB9', RUST);
  drawText(NOTYET, M + 2 + nx, 1020, 'sans9', BODYTX, -0.35);
}

paintFurniture();
downsample();
paintText();
mkdirSync('/output', { recursive: true });
const png = encodePNG();
writeFileSync('/output/entry.png', png);
console.log('wrote /output/entry.png', png.length, 'bytes');
