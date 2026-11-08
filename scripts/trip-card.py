#!/usr/bin/env python3
"""Draw the dashboard card for the trip: a pixel sky, Hong Kong on the left, New York on the
right, a dotted route between them with a small plane on it. 160×100 pixels, scaled 6× with no
smoothing to public/media/dashboard/trip.png (960×600, like the infirmary's card)."""
from PIL import Image, ImageDraw
import math, pathlib

W, H = 160, 100
img = Image.new('RGB', (W, H))
px = img.load()

# Sky: dusk, from navy at the top to peach at the horizon; sea below it.
TOP, MID, HOR = (0x1c, 0x2f, 0x55), (0x6f, 0x9c, 0xc8), (0xf3, 0xc4, 0xa8)
SEA, FOAM = (0x2f, 0x5f, 0x8f), (0x6f, 0x9c, 0xc8)
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
for y in range(H):
    if y < 72:
        t = y / 71
        c = lerp(TOP, MID, t / .6) if t < .6 else lerp(MID, HOR, (t - .6) / .4)
    else:
        c = SEA
    for x in range(W): px[x, y] = c
for y in range(72, H, 4):
    for x in range((y // 4) % 7, W, 7): px[x, y] = FOAM

d = ImageDraw.Draw(img)
# Stars high up, a moon.
for (x, y) in [(12, 6), (40, 12), (77, 4), (101, 9), (133, 14), (150, 5), (62, 19), (118, 3)]: px[x, y] = (0xff, 0xf4, 0xd6)
d.ellipse([136, 16, 146, 26], fill=(0xff, 0xf1, 0xc6)); d.ellipse([139, 14, 149, 24], fill=lerp(TOP, MID, .35))

NAVY, WIN = (0x10, 0x2e, 0x49), (0xff, 0xd9, 0x7a)
def tower(x, w, h, spire=0):
    d.rectangle([x, 72 - h, x + w - 1, 72], fill=NAVY)
    if spire: d.line([x + w // 2, 72 - h - spire, x + w // 2, 72 - h], fill=NAVY)
    for yy in range(74 - h, 70, 3):
        for xx in range(x + 1, x + w - 1, 2):
            if (xx * 7 + yy * 3) % 5: px[xx, yy] = WIN
# Hong Kong: a hill behind, dense towers, the two tallest with a spire.
d.polygon([(0, 72), (6, 52), (18, 46), (30, 54), (40, 72)], fill=(0x1a, 0x3a, 0x4a))
for x, w, h, s in [(2, 4, 22, 0), (7, 5, 30, 4), (13, 4, 26, 0), (18, 6, 38, 6), (25, 4, 28, 0), (30, 5, 24, 0), (36, 3, 18, 0)]: tower(x, w, h, s)
# New York: a skyline that ends in one tall spire on the far right.
for x, w, h, s in [(116, 3, 16, 0), (120, 5, 26, 0), (126, 4, 34, 0), (131, 6, 44, 10), (138, 4, 30, 0), (143, 5, 36, 3), (149, 4, 24, 0), (154, 4, 18, 0)]: tower(x, w, h, s)

# The route: a dotted arc from Hong Kong's spire to New York's.
GOLD, ROSE = (0xd3, 0xa5, 0x57), (0xd4, 0x50, 0x6d)
x0, y0, x1, y1 = 21, 30, 134, 20
pts = []
for i in range(0, 101):
    t = i / 100
    x = x0 + (x1 - x0) * t
    y = (y0 + (y1 - y0) * t) - 22 * math.sin(math.pi * t)
    pts.append((round(x), round(y)))
for i, (x, y) in enumerate(pts):
    if i % 4 == 0: px[x, y] = GOLD
# The plane, a little past half-way, nose to the right.
ax, ay = pts[58]
WHITE = (0xff, 0xff, 0xff)
for dx, dy in [(-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0), (-1, -1), (0, -1), (0, -2), (-1, 1), (0, 1), (0, 2), (-3, -1), (-3, 1)]: px[ax + dx, ay + dy] = WHITE
px[ax + 4, ay] = ROSE
# A heart waiting on the New York side.
hx, hy = 134, 8
for dx, dy in [(-2, -1), (-1, -2), (0, -1), (1, -2), (2, -1), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2)]: px[hx + dx, hy + dy] = ROSE

out = pathlib.Path(__file__).resolve().parents[1] / 'public/media/dashboard/trip.png'
img.resize((W * 6, H * 6), Image.NEAREST).save(out, optimize=True)
print(out, out.stat().st_size, 'bytes')
