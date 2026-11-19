"""
python3 cut.py            (needs Pillow and numpy)

Cuts Root out of the original character sheets in ./originals and writes

  assets/mascot/<pose>.png          one transparent picture per pose
  src/components/mascotStills.ts    the manifest the app reads
  contact.jpg                       every pose on one sheet, for review

The originals are generated illustrations on a white background, several poses to a sheet.
SHEETS says which sheet each pose is on and which figure it is, counting from the left.
To add poses: put the new sheet in ./originals, add a line per figure to SHEETS, run this.

How a figure is cut out: everything white that touches the edge of the sheet is background.
White that is closed in (the eyes, the teeth) is part of Root and is kept. The outline is then
softened by one pixel so there is no white fringe on a coloured card.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'mascot')

# pose: (sheet file, which figure from the left, where the middle of the face is as a fraction of the figure's height)
SHEETS = {
    'wave': ('sheet-1.jpg', 0, 0.47),
    'cheer': ('sheet-1.jpg', 1, 0.47),
    'think': ('sheet-1.jpg', 2, 0.47),
}
# A pose that stands on the ground. Every pose is laid out at this one's height, so Root is the same size in all of them.
STANDING = 'wave'
WHITE = 236      # a pixel whose darkest channel is at least this is "white"
PAD = 6


def background(rgb):
    """True where the sheet is background: white, and joined to the edge of the sheet by white."""
    h, w, _ = rgb.shape
    white = rgb.min(axis=2) >= WHITE
    bg = np.zeros((h, w), bool)
    todo = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white[y, x] and not bg[y, x]:
                bg[y, x] = True; todo.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if white[y, x] and not bg[y, x]:
                bg[y, x] = True; todo.append((y, x))
    while todo:
        y, x = todo.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; todo.append((ny, nx))
    # A sliver of the sheet can be closed in by Root itself (between a raised fist and a cheek). Closed-in white
    # that is small and has Root's orange all round it is such a gap. The eyes' highlights are small too, but they
    # sit in the dark of the pupil, and the whites of the eyes are large: both are left alone.
    seen = bg.copy()
    for sy in range(h):
        for sx in range(w):
            if not white[sy, sx] or seen[sy, sx]:
                continue
            comp, rim, todo = [], [], deque([(sy, sx)])
            seen[sy, sx] = True
            while todo:
                y, x = todo.popleft()
                comp.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if not (0 <= ny < h and 0 <= nx < w):
                        continue
                    if white[ny, nx]:
                        if not seen[ny, nx]:
                            seen[ny, nx] = True; todo.append((ny, nx))
                    else:
                        rim.append(rgb[ny, nx])
            if len(comp) < 260 and rim and np.mean([c.max() for c in rim]) > 190 and np.mean([c[2] for c in rim]) < 150:
                for y, x in comp:
                    bg[y, x] = True
    return bg


def figures(bg):
    """Column ranges of the figures on a sheet, left to right."""
    cols = (~bg).sum(axis=0) > 2
    out, start = [], None
    for x, on in enumerate(list(cols) + [False]):
        if on and start is None:
            start = x
        if not on and start is not None:
            if x - start > 40:
                out.append((start, x))
            start = None
    return out


def cut(sheet, index):
    im = Image.open(os.path.join(HERE, 'originals', sheet)).convert('RGB')
    rgb = np.asarray(im).astype(np.float32)
    bg = background(rgb)
    x0, x1 = figures(bg)[index]
    ys = np.where((~bg[:, x0:x1]).any(axis=1))[0]
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1, y0, y1 = max(0, x0 - PAD), min(im.width, x1 + PAD), max(0, y0 - PAD), min(im.height, y1 + PAD)
    rgb, bg = rgb[y0:y1, x0:x1], bg[y0:y1, x0:x1]

    # Solid inside, clear outside, and a soft one-pixel edge between them.
    solid = Image.fromarray(((~bg) * 255).astype(np.uint8))
    alpha = np.asarray(solid.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))).astype(np.float32) / 255
    # The outermost pixels of the figure were blended with the white sheet. Take the white back out,
    # using the colour just inside the edge, so nothing pale is left around the outline.
    inner = np.asarray(Image.fromarray(rgb.astype(np.uint8)).filter(ImageFilter.MinFilter(5))).astype(np.float32)
    edge = np.asarray(solid.filter(ImageFilter.MinFilter(7))).astype(np.float32) / 255 < 0.5
    paint = np.where(edge[..., None], inner, rgb)
    out = np.dstack([paint, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    cuts = {pose: cut(sheet, i) for pose, (sheet, i, _) in SHEETS.items()}
    stand = cuts[STANDING].height - 2 * PAD   # leaf tips to soles, in sheet pixels
    rows = []
    for pose, im in cuts.items():
        im.save(os.path.join(OUT, pose + '.png'), optimize=True)
        face = SHEETS[pose][2]
        figure_h = im.height - 2 * PAD
        # Fractions of the picture height, from the top. The layout box starts at the leaf tips and is one standing Root tall.
        top = PAD / im.height
        # The middle of the head, sideways: the forehead band, which a raised hand never reaches.
        a = np.asarray(im)[:, :, 3]
        band = a[PAD + int(figure_h * 0.24):PAD + int(figure_h * 0.34)]
        xs = np.where(band.max(axis=0) > 128)[0]
        cx = (xs.min() + xs.max()) / 2 / im.width
        rows.append("  %s: { src: require('../../assets/mascot/%s.png'), w: %d, h: %d, top: %.4f, stand: %.4f, aspect: %.3f, face: %.4f, cx: %.4f },"
                    % (pose, pose, im.width, im.height, top, stand / im.height, (im.width - 2 * PAD) / stand, (PAD + face * figure_h) / im.height, cx))
        print('%-6s %dx%d' % (pose, im.width, im.height))
    ts = """// GENERATED by tools/mascot/cut.py. Do not edit by hand: change SHEETS there and run it again.
//
// One entry per picture of Root. w × h is the picture in pixels. Fractions are of the picture's height, from the top:
//   top    where Root's leaf tips are: the top of the layout box
//   stand  the height of a standing Root: what a Mascot `size` maps to. The same in sheet pixels for every pose,
//          so Root is the same size whichever picture is showing. A pose that is off the ground ends above the box bottom.
//   face   the middle of the face, for the round avatar crop (`cx` is the middle of the head sideways, as a fraction of the width)
// `aspect` is the layout box's width over its height.

export type Pose = %s;

export type Still = { src: number; w: number; h: number; top: number; stand: number; aspect: number; face: number; cx: number };

export const STILLS: Record<Pose, Still> = {
%s
};
""" % (' | '.join("'%s'" % p for p in cuts), '\n'.join(rows))
    open(os.path.join(ROOT, 'src', 'components', 'mascotStills.ts'), 'w').write(ts)

    # contact sheet: on the app's periwinkle and on black, to check the outline on both
    H = 420
    tiles = [im.resize((round(im.width * H / im.height), H), Image.LANCZOS) for im in cuts.values()]
    W = sum(t.width + 20 for t in tiles) + 20
    sheet = Image.new('RGB', (W, 2 * (H + 20) + 20), (157, 183, 255))
    sheet.paste((14, 14, 19), (0, H + 30, W, 2 * (H + 20) + 20))
    for row in range(2):
        x = 20
        for t in tiles:
            sheet.paste(t, (x, 20 + row * (H + 20)), t); x += t.width + 20
    sheet.save(os.path.join(HERE, 'contact.jpg'), quality=90)


if __name__ == '__main__':
    sys.exit(main())
