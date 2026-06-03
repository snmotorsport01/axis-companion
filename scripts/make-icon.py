#!/usr/bin/env python3
"""
Generate the iOS App Icon (1024×1024) for AXIS Companion.

Why a script: the source SN logo lives in public/sn-splash.png at 360×360
with the "SN MOTORSPORTS" wordmark baked underneath the mark. The icon
slot wants a tight, square, *fully-opaque* image (Apple rejects PNGs with
alpha for the App Store icon and renders the rounded corners itself). So
we crop the mark out of the splash, recolour it to pure white for max
contrast, and composite onto a charcoal background that matches the
app's runtime theme.

Run from anywhere:
    python3 scripts/make-icon.py

Re-run any time the brand wordmark changes. The output overwrites the
existing icon at ios/App/App/Assets.xcassets/AppIcon.appiconset/.
"""
from __future__ import annotations
import os, sys
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'public', 'sn-splash.png')
DST  = os.path.join(ROOT, 'ios', 'App', 'App',
                    'Assets.xcassets', 'AppIcon.appiconset',
                    'AppIcon-512@2x.png')

# ---- Design ----------------------------------------------------------
CANVAS_PX   = 1024
BG_TOP      = (0x18, 0x18, 0x18)    # dark charcoal — matches app shell
BG_BOTTOM   = (0x05, 0x05, 0x05)    # near-black bottom for depth
LOGO_INK    = (0xFF, 0xFF, 0xFF)    # crisp white logo
# Logo crop: scanning the splash's alpha channel by row shows the mark
# lives at y=69..248 (a 180-px-tall block) and the "SN MOTORSPORTS"
# wordmark sits below at y=273..290 (18 px). Crop to a 195-px window
# centred on the mark — getbbox() then trims any residual padding.
SRC_CROP_BOX = (0, 60, 360, 255)
# Final logo size on the 1024 canvas. ~62 % of canvas gives plenty of
# margin so iOS's rounded-corner mask doesn't clip the mark.
LOGO_SIZE_PX = 640


def vertical_gradient(size: int, top: tuple, bottom: tuple) -> Image.Image:
    """Solid square filled with a vertical gradient between two RGB
    colours. Cheaper than blending two images and keeps tone subtle."""
    base = Image.new('RGB', (size, size), top)
    px = base.load()
    for y in range(size):
        t = y / (size - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return base


def recolour_mask(rgba: Image.Image, ink: tuple) -> Image.Image:
    """Treat the alpha channel of `rgba` as a mask and stamp `ink` onto
    it. Keeps anti-aliased edges intact while ditching the original
    pixel colours (the splash mark is mid-grey — we want it pure white)."""
    a = rgba.split()[-1]
    coloured = Image.new('RGBA', rgba.size, ink + (0,))
    coloured.putalpha(a)
    return coloured


def main() -> None:
    if not os.path.exists(SRC):
        print(f'[icon] source not found: {SRC}', file=sys.stderr)
        sys.exit(1)

    src = Image.open(SRC).convert('RGBA')
    mark = src.crop(SRC_CROP_BOX)
    # Trim transparent borders so the mark itself fills LOGO_SIZE_PX, not
    # the crop box's empty padding. getbbox() reads the alpha channel.
    bbox = mark.getbbox()
    if bbox:
        mark = mark.crop(bbox)

    # Scale to a square LOGO_SIZE_PX × LOGO_SIZE_PX, preserving aspect by
    # padding with full transparency. Centred so the mark lands in the
    # exact middle of the icon canvas.
    longest = max(mark.size)
    pad = Image.new('RGBA', (longest, longest), (0, 0, 0, 0))
    pad.paste(mark, ((longest - mark.size[0]) // 2,
                    (longest - mark.size[1]) // 2))
    mark_sq = pad.resize((LOGO_SIZE_PX, LOGO_SIZE_PX), Image.Resampling.LANCZOS)

    mark_white = recolour_mask(mark_sq, LOGO_INK)

    canvas = vertical_gradient(CANVAS_PX, BG_TOP, BG_BOTTOM).convert('RGBA')
    offset = ((CANVAS_PX - LOGO_SIZE_PX) // 2,
              (CANVAS_PX - LOGO_SIZE_PX) // 2)
    canvas.alpha_composite(mark_white, dest=offset)

    # App Store icon must be RGB (no alpha). Convert with a hard
    # background composite so transparent edge pixels don't drop to
    # black ringing.
    rgb = Image.new('RGB', (CANVAS_PX, CANVAS_PX), BG_BOTTOM)
    rgb.paste(canvas, mask=canvas.split()[-1])
    rgb.save(DST, format='PNG', optimize=True)
    print(f'[icon] wrote {DST}  ({CANVAS_PX}×{CANVAS_PX} RGB)')


if __name__ == '__main__':
    main()
