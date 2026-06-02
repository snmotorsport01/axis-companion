#!/usr/bin/env python3
"""
build-icons.py — generate iOS + PWA icon assets from a single source PNG.

Source is expected to be a light-coloured logo on a (mostly) white
background, like the SN Motorsports mark. The script:

  1. Chroma-keys the white background away (pixels > THRESH become
     transparent), preserving anti-aliased edges of the logo lines.
  2. Composites the logo, centred, onto a solid black square at the
     target size. iOS App Store rejects icons with an alpha channel,
     so the output is always opaque RGB.
  3. Writes the iOS AppIcon (1024x1024) into the Capacitor iOS asset
     catalog and the PWA icons (192/512/512-maskable) into public/icons.
  4. Maskable icons reserve a ~80% safe area as required by the W3C
     spec, so the logo doesn't get cut by the platform mask.

Usage:
    python3 tools/build-icons.py <source.png>

After running, `npm run build:device && npx cap copy ios` will pick up
the new icons, and the next Xcode build will ship them.
"""
import os, sys
from PIL import Image

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IOS_ICON   = os.path.join(
    ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
PWA_ICONS  = os.path.join(ROOT, 'public/icons')

# White-pixel chroma-key threshold. Anything with all three RGB channels
# above this value is treated as background and made transparent. 240
# keeps soft anti-aliased edges in the line; 250 would only kill pure
# white. 235 starts eating into light-grey logo lines — too aggressive.
THRESH = 240

# Default padding inside the icon canvas (% of canvas edge per side).
# iOS auto-rounds the icon; a bit of breathing room makes the logo
# read better when the rounded mask trims the corners.
PAD_PCT_STANDARD = 0.10   # iOS / favicon
PAD_PCT_MASKABLE = 0.20   # Android maskable — needs ~80% safe zone


def load_logo(path: str) -> Image.Image:
    """Open source PNG and turn the white background into alpha=0."""
    img = Image.open(path).convert('RGBA')
    px  = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= THRESH and g >= THRESH and b >= THRESH:
                px[x, y] = (0, 0, 0, 0)
    return img


def render(logo: Image.Image, size: int, pad_pct: float, *, opaque: bool) -> Image.Image:
    """Composite logo, centred, onto a black square at the given size."""
    mode = 'RGB' if opaque else 'RGBA'
    bg   = (0, 0, 0) if opaque else (0, 0, 0, 255)
    canvas = Image.new(mode, (size, size), bg)
    # Resize logo to fit within (1 - 2*pad) of canvas, preserving aspect.
    inner = int(size * (1 - 2 * pad_pct))
    src_w, src_h = logo.size
    scale = min(inner / src_w, inner / src_h)
    lw, lh = int(src_w * scale), int(src_h * scale)
    resized = logo.resize((lw, lh), Image.LANCZOS)
    off = ((size - lw) // 2, (size - lh) // 2)
    canvas.paste(resized, off, resized.split()[3])
    return canvas


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    src = os.path.abspath(sys.argv[1])
    if not os.path.exists(src):
        print(f'ERROR: source not found: {src}')
        return 1

    print(f'Loading logo: {src}')
    logo = load_logo(src)
    print(f'  size = {logo.size}, mode = {logo.mode}')

    os.makedirs(PWA_ICONS, exist_ok=True)

    # iOS AppIcon — single 1024 master, Xcode generates the rest from it.
    print(f'iOS AppIcon  → {IOS_ICON}')
    render(logo, 1024, PAD_PCT_STANDARD, opaque=True).save(IOS_ICON, 'PNG')

    # PWA manifest icons. Black background (opaque) so a maskable mask
    # can't make the corners disappear.
    for size in (192, 512):
        out = os.path.join(PWA_ICONS, f'icon-{size}.png')
        print(f'PWA  {size:4d}px → {out}')
        render(logo, size, PAD_PCT_STANDARD, opaque=True).save(out, 'PNG')

    out_mask = os.path.join(PWA_ICONS, 'icon-512-maskable.png')
    print(f'PWA mask 512px → {out_mask}')
    render(logo, 512, PAD_PCT_MASKABLE, opaque=True).save(out_mask, 'PNG')

    # Apple touch icon (used by iOS Safari when you add-to-home a PWA).
    apple = os.path.join(ROOT, 'public/apple-touch-icon.png')
    print(f'Apple touch  → {apple}')
    render(logo, 180, PAD_PCT_STANDARD, opaque=True).save(apple, 'PNG')

    print('Done. Now run:  npm run build:device && npx cap copy ios')
    return 0


if __name__ == '__main__':
    sys.exit(main())
