#!/usr/bin/env python3
"""Pre-render glyph bitmaps with PIL/FreeType into atlas.dat.

The entry's main.ts never draws letter outlines (that was the ink-bleed
disease). Instead it blits these real rasterized glyph bitmaps 1:1.

atlas.dat layout:
  [4 bytes big-endian header length][header JSON][zlib grayscale pixels]
header: {"width":W,"height":H,"styles":{name:{"ascent":a,"descent":d,
  "glyphs":{char:[x,y,w,h,dx,dy,advance]}}}}
dx,dy = ink top-left relative to the pen origin (pen x, baseline y).
"""
import json, struct, zlib
from PIL import Image, ImageDraw, ImageFont

SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

STYLES = {
    "serif54": (SERIF_B, 54),
    "serif23": (SERIF_B, 23),
    "serif19": (SERIF_B, 19),
    "serif14": (SERIF_B, 14),
    "sansB42": (SANS_B, 42),
    "sansB25": (SANS_B, 25),
    "sans12": (SANS, 12),
    "sansB11": (SANS_B, 11),
    "sans11": (SANS, 11),
    "sansB10": (SANS_B, 10),
    "sans10": (SANS, 10),
    "sansB9": (SANS_B, 9),
    "sans9": (SANS, 9),
}

CHARS = [chr(c) for c in range(32, 127)] + list("•·—–‘’“”…×°−£")

ATLAS_W = 1024


def render_glyph(font, ch):
    size = font.size
    pad = size * 2
    canvas = Image.new("L", (size * 5, size * 5), 0)
    d = ImageDraw.Draw(canvas)
    d.text((pad, pad), ch, font=font, fill=255, anchor="ls")
    bbox = canvas.getbbox()
    adv = float(font.getlength(ch))
    if bbox is None:
        return None, adv
    x0, y0, x1, y1 = bbox
    mask = canvas.crop(bbox)
    return (mask, x0 - pad, y0 - pad), adv


def main():
    # First pass: render every glyph, collect bitmaps.
    jobs = []  # (style, ch, mask, dx, dy, adv)
    header_styles = {}
    for name, (path, size) in STYLES.items():
        font = ImageFont.truetype(path, size)
        asc, desc = font.getmetrics()
        header_styles[name] = {"ascent": asc, "descent": desc, "glyphs": {}}
        for ch in CHARS:
            got, adv = render_glyph(font, ch)
            if got is None:
                header_styles[name]["glyphs"][ch] = [0, 0, 0, 0, 0, 0, round(adv, 2)]
            else:
                mask, dx, dy = got
                jobs.append([name, ch, mask, dx, dy, round(adv, 2)])
    # Shelf-pack all bitmaps.
    x = y = 0
    row_h = 0
    placed = []
    for name, ch, mask, dx, dy, adv in jobs:
        w, h = mask.size
        if x + w > ATLAS_W:
            x = 0
            y += row_h + 1
            row_h = 0
        placed.append((name, ch, mask, x, y, dx, dy, adv))
        header_styles[name]["glyphs"][ch] = [x, y, w, h, dx, dy, adv]
        x += w + 1
        row_h = max(row_h, h)
    atlas_h = y + row_h
    atlas = Image.new("L", (ATLAS_W, atlas_h), 0)
    for name, ch, mask, px, py, dx, dy, adv in placed:
        atlas.paste(mask, (px, py))
    header = {"width": ATLAS_W, "height": atlas_h, "styles": header_styles}
    hj = json.dumps(header, separators=(",", ":"), ensure_ascii=True).encode()
    raw = atlas.tobytes()
    blob = struct.pack(">I", len(hj)) + hj + zlib.compress(raw, 9)
    with open("atlas.dat", "wb") as f:
        f.write(blob)
    print(f"atlas.dat: {len(blob)} bytes (raw pixels {len(raw)}, atlas {ATLAS_W}x{atlas_h})")
    print(f"styles: {len(STYLES)}, glyphs/style: {len(CHARS)}")


if __name__ == "__main__":
    main()
