"""
python3 icons.py          (needs Pillow; run cut.py first)

Makes the app icon and favicon from the close-up portrait in ./originals, and the Android
adaptive foreground and the splash picture from the waving Root in assets/mascot.
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.abspath(os.path.join(HERE, '..', '..', 'assets'))
PERIWINKLE = (157, 183, 255)
root = Image.open(os.path.join(ASSETS, 'mascot', 'wave.webp')).convert('RGBA')
portrait = Image.open(os.path.join(HERE, 'originals', 'icon-portrait.jpg')).convert('RGB')


def canvas(size, figure_h, bg=None, dy=0.0):
    """Root `figure_h` of the canvas tall, centred, on `bg` (or transparent)."""
    im = Image.new('RGBA', (size, size), bg + (255,) if bg else (0, 0, 0, 0))
    h = round(size * figure_h)
    fig = root.resize((round(root.width * h / root.height), h), Image.LANCZOS)
    im.alpha_composite(fig, ((size - fig.width) // 2, round((size - h) / 2 + dy * size)))
    return im


portrait.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ASSETS, 'icon.png'), optimize=True)
portrait.resize((192, 192), Image.LANCZOS).save(os.path.join(ASSETS, 'favicon.png'), optimize=True)
# Android crops the adaptive foreground to its middle two thirds.
canvas(1024, 0.54).save(os.path.join(ASSETS, 'android-icon-foreground.png'), optimize=True)
canvas(1024, 0.92).save(os.path.join(ASSETS, 'splash-icon.png'), optimize=True)
