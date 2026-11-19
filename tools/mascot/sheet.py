"""python3 sheet.py out.jpg img1 img2 …  [--h 520] [--bg dark|peri|white]  → side-by-side contact sheet"""
import sys
from PIL import Image
args = sys.argv[1:]
H = 520; bg = (157, 183, 255)
if '--h' in args: i = args.index('--h'); H = int(args[i + 1]); del args[i:i + 2]
if '--bg' in args:
    i = args.index('--bg'); bg = {'dark': (14, 14, 18), 'peri': (157, 183, 255), 'white': (255, 255, 255)}[args[i + 1]]; del args[i:i + 2]
out, files = args[0], args[1:]
tiles = []
for f in files:
    im = Image.open(f).convert('RGBA'); im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS); tiles.append(im)
W = sum(t.width for t in tiles) + 12 * (len(tiles) + 1)
sh = Image.new('RGB', (W, H + 24), bg); x = 12
for t in tiles: sh.paste(t, (x, 12), t); x += t.width + 12
sh.save(out, quality=90)
