#!/usr/bin/env python3
"""Draw the dashboard card for Our Album: a pale travel map with a dotted route between two pins,
and three instant photos fanned across it (a sunset sea, a city at night, the town green). 160×100
pixels, scaled 6× with no smoothing to public/media/dashboard/photos.png (960×600, like the others)."""
from PIL import Image, ImageDraw
import pathlib

W, H = 160, 100
img = Image.new('RGB', (W, H), (0xe9, 0xe1, 0xcc))
d = ImageDraw.Draw(img)
NAVY, CREAM, GOLD, ROSE = (0x10, 0x2e, 0x49), (0xfb, 0xf6, 0xec), (0xd3, 0xa5, 0x57), (0xd4, 0x50, 0x6d)
SEA, LAND, LAND2 = (0xb9, 0xd8, 0xe6), (0xdc, 0xd3, 0xb4), (0xcf, 0xc4, 0xa0)

# The map: sea, two coasts, a faint grid.
d.rectangle([0, 0, W, H], fill=SEA)
d.polygon([(0, 0), (52, 0), (60, 14), (48, 30), (56, 52), (40, 70), (46, 100), (0, 100)], fill=LAND)
d.polygon([(112, 0), (160, 0), (160, 100), (120, 100), (128, 76), (110, 58), (124, 36), (106, 18)], fill=LAND)
for x in range(0, W, 16): d.line([(x, 0), (x, H)], fill=(0xa9, 0xc9, 0xd8))
for y in range(0, H, 16): d.line([(0, y), (W, y)], fill=(0xa9, 0xc9, 0xd8))
for x, y in [(20, 40), (30, 80), (140, 20), (146, 70)]:
    d.rectangle([x, y, x + 6, y + 4], fill=LAND2)

# The route: dots from one pin to the other, arching over the sea.
a, b = (30, 24), (138, 52)
for i in range(1, 30):
    t = i / 30
    x = a[0] + (b[0] - a[0]) * t
    y = a[1] + (b[1] - a[1]) * t - 26 * 4 * t * (1 - t)
    if i % 2: d.rectangle([round(x), round(y), round(x), round(y)], fill=NAVY)

def pin(x, y):
    d.ellipse([x - 4, y - 10, x + 4, y - 2], fill=ROSE, outline=NAVY)
    d.polygon([(x - 2, y - 4), (x + 2, y - 4), (x, y)], fill=ROSE)
    d.point((x, y), fill=NAVY)
    d.rectangle([x - 1, y - 7, x, y - 6], fill=CREAM)
pin(*a); pin(*b)

def polaroid(x, y, scene):
    """A 30×36 instant photo: navy outline, cream frame, a 24×22 picture."""
    d.rectangle([x + 2, y + 2, x + 32, y + 38], fill=(0x8a, 0x80, 0x6a))       # shadow
    d.rectangle([x - 1, y - 1, x + 30, y + 36], fill=NAVY)
    d.rectangle([x, y, x + 29, y + 35], fill=CREAM)
    px0, py0 = x + 3, y + 3
    scene(px0, py0)
    d.rectangle([px0 - 1, py0 - 1, px0 + 24, py0 + 22], outline=NAVY)

def sunset(x, y):
    for r in range(12):
        c = (0xf3 - r * 2, 0x9c + r * 5, 0x7a + r * 6)
        d.line([(x, y + r), (x + 23, y + r)], fill=c)
    d.ellipse([x + 8, y + 7, x + 15, y + 14], fill=(0xff, 0xe0, 0x8a))
    d.rectangle([x, y + 12, x + 23, y + 21], fill=(0x3b, 0x6e, 0x9c))
    for i in range(4): d.line([(x + 4 + i * 5, y + 15 + i % 2 * 3), (x + 6 + i * 5, y + 15 + i % 2 * 3)], fill=(0xff, 0xe0, 0x8a))

def city(x, y):
    d.rectangle([x, y, x + 23, y + 21], fill=(0x1b, 0x2b, 0x4f))
    for bx, bh in [(1, 12), (5, 16), (10, 9), (14, 18), (19, 11)]:
        d.rectangle([x + bx, y + 21 - bh, x + bx + 3, y + 21], fill=(0x0b, 0x18, 0x30))
        for wy in range(y + 23 - bh, y + 20, 3): d.point((x + bx + 1, wy), fill=(0xf5, 0xd2, 0x6a))
    d.point((x + 20, y + 3), fill=(0xff, 0xf4, 0xd6)); d.point((x + 6, y + 2), fill=(0xff, 0xf4, 0xd6))

def green(x, y):
    d.rectangle([x, y, x + 23, y + 12], fill=(0x8c, 0xc8, 0xea))
    d.rectangle([x, y + 13, x + 23, y + 21], fill=(0x6a, 0xb0, 0x4c))
    d.rectangle([x + 9, y + 8, x + 16, y + 15], fill=(0xf6, 0xec, 0xd9)); d.polygon([(x + 8, y + 8), (x + 17, y + 8), (x + 12, y + 4)], fill=ROSE)
    for fx in (3, 19): d.point((x + fx, y + 17), fill=ROSE)

polaroid(42, 34, sunset)
polaroid(68, 46, city)
polaroid(94, 32, green)
# A strip of gold tape on the middle one.
d.rectangle([78, 44, 88, 47], fill=GOLD)

out = pathlib.Path(__file__).resolve().parent.parent / 'public/media/dashboard/photos.png'
img.resize((W * 6, H * 6), Image.NEAREST).save(out)
print(out)
