#!/usr/bin/env python3
"""Draw the dashboard card for Ask Yifan: a morning sky over the town green, a cream envelope
sealed with a heart, and a paper plane leaving it on a dotted line. 160×100 pixels, scaled 6×
with no smoothing to public/media/dashboard/ask.png (960×600, like the trip's card)."""
from PIL import Image, ImageDraw
import math, pathlib

W, H = 160, 100
img = Image.new('RGB', (W, H))
px = img.load()
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

# Sky from blue to a pale horizon, then the green with a few darker tufts and flowers.
TOP, HOR = (0x6f, 0xb4, 0xe6), (0xdf, 0xf1, 0xf6)
GRASS, TUFT = (0x6a, 0xb0, 0x4c), (0x58, 0x9c, 0x40)
for y in range(H):
    c = lerp(TOP, HOR, y / 61) if y < 62 else GRASS
    for x in range(W): px[x, y] = c
for y in range(64, H, 5):
    for x in range((y * 3) % 11, W, 11): px[x, y] = TUFT; px[x + 1 if x + 1 < W else x, y - 1] = TUFT
d = ImageDraw.Draw(img)
WHITE, NAVY, CREAM, SHADE = (0xff, 0xff, 0xff), (0x10, 0x2e, 0x49), (0xf6, 0xec, 0xd9), (0xe2, 0xd2, 0xb4)
GOLD, ROSE = (0xd3, 0xa5, 0x57), (0xd4, 0x50, 0x6d)
for cx, cy, r in [(24, 14, 5), (31, 15, 6), (38, 14, 4), (118, 30, 4), (124, 31, 5), (130, 30, 3)]:
    d.ellipse([cx - r, cy - r // 2 - 1, cx + r, cy + r // 2 + 1], fill=WHITE)
for x, y in [(14, 84), (46, 92), (120, 88), (146, 76), (98, 95)]:
    px[x, y] = (0xff, 0xf4, 0xd6); px[x - 1, y] = px[x + 1, y] = px[x, y - 1] = px[x, y + 1] = ROSE

# The envelope, standing on the green: navy outline, gold trim, the flap as two lines to the seal.
x0, y0, x1, y1 = 28, 40, 92, 84
d.rectangle([x0 + 3, y1 + 1, x1 + 3, y1 + 3], fill=TUFT)                     # its shadow
d.rectangle([x0 - 1, y0 - 1, x1 + 1, y1 + 1], fill=GOLD)
d.rectangle([x0, y0, x1, y1], fill=NAVY)
d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=CREAM)
mx, my = (x0 + x1) // 2, y0 + 24
d.polygon([(x0 + 2, y0 + 2), (x1 - 2, y0 + 2), (mx, my)], fill=SHADE)
d.line([(x0 + 2, y0 + 2), (mx, my)], fill=NAVY); d.line([(x1 - 2, y0 + 2), (mx, my)], fill=NAVY)
d.line([(x0 + 2, y1 - 2), (mx - 9, my - 3)], fill=SHADE); d.line([(x1 - 2, y1 - 2), (mx + 9, my - 3)], fill=SHADE)
# The seal: a heart.
for dx, dy in [(-3, -2), (-2, -3), (-1, -2), (1, -2), (2, -3), (3, -2), (-3, -1), (-2, -1), (-1, -1), (0, -1), (1, -1), (2, -1), (3, -1),
               (-2, -2), (2, -2), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2)]:
    px[mx + dx, my + dy] = ROSE

# The plane's path: a dotted arc up and to the right, the plane at its end.
pts = []
for i in range(0, 101):
    t = i / 100
    pts.append((round(96 + 46 * t), round(46 - 26 * t - 8 * math.sin(math.pi * t))))
for i, (x, y) in enumerate(pts[:-8]):
    if i % 5 == 0: px[x, y] = GOLD
ax, ay = pts[-1]
d.polygon([(ax - 9, ay + 1), (ax + 5, ay - 5), (ax - 3, ay + 7)], fill=WHITE, outline=NAVY)
d.line([(ax - 4, ay + 2), (ax + 5, ay - 5)], fill=NAVY)

out = pathlib.Path(__file__).resolve().parents[1] / 'public/media/dashboard/ask.png'
img.resize((W * 6, H * 6), Image.NEAREST).save(out, optimize=True)
print(out, out.stat().st_size, 'bytes')
