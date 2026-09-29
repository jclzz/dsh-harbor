#!/usr/bin/env python3
"""Trim uniform bottom rows from the full-page shot, emit 1x preview + section crops."""
import sys
from PIL import Image

src, out_full, out_preview = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()
bg = px[w // 2, h - 1]

def row_uniform(y):
    step = 40
    for x in range(0, w, step):
        p = px[x, y]
        if abs(p[0] - bg[0]) > 6 or abs(p[1] - bg[1]) > 6 or abs(p[2] - bg[2]) > 6:
            return False
    return True

bottom = h
while bottom > 0 and row_uniform(bottom - 1):
    bottom -= 1
bottom = min(h, bottom + 24)  # small padding
im = im.crop((0, 0, w, bottom))
im.save(out_full)
preview = im.resize((w // 2, bottom // 2), Image.LANCZOS)
preview.save(out_preview)
print(f"trimmed: {w}x{bottom}  preview: {preview.size[0]}x{preview.size[1]}")
