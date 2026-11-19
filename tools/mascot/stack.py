"""python3 stack.py out.jpg strip1.jpg strip2.jpg …  → strips stacked vertically, each scaled to the same width"""
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
W = 1900
ims = []
for f in files:
    im = Image.open(f); ims.append(im.resize((W, round(im.height * W / im.width)), Image.LANCZOS))
sh = Image.new('RGB', (W, sum(i.height for i in ims)), (157, 183, 255)); y = 0
for i in ims: sh.paste(i, (0, y)); y += i.height
sh.save(out, quality=88)
