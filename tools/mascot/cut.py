"""
python3 cut.py            (needs Pillow and numpy)

Cuts every picture out of the illustrated sheets in ./originals and writes

  assets/mascot/<pose>.webp         Root, one transparent picture per pose
  assets/props/<name>.webp          the keepsakes and the journey objects
  assets/scenes/valley.webp         the whole valley, for the story's opening
  src/components/mascotStills.ts    the manifest the app reads
  contact.jpg                       every pose on one sheet, for review

The originals are generated illustrations on a white background, several figures to a sheet,
laid out in a grid. POSES and OBJECTS below say what is on each sheet.

To add poses: put the new sheet in ./originals, add a line to POSES, run this, look at contact.jpg.

How a figure is cut out: everything white that touches the edge of the sheet is background.
White that is closed in (the eyes, a page of a book) is part of the picture and is kept. Each
figure is whatever lies in its cell of the grid, so a prop that floats free of Root (a
lightbulb, drops of water) stays with it. The outline is then softened by one pixel and the
white taken back out of it, so there is no pale fringe on a coloured card.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
WHITE = 236      # a pixel whose darkest channel is at least this is "white"
PAD = 6

# sheet, rows, columns, the poses in reading order, and which of them is a plain standing Root
# (nothing above its leaves, both feet down): that one measures how tall Root is on this sheet.
POSES = [
    ('sheet-1.jpg', 1, 3, ['wave', 'cheer', 'think'], 'wave'),
    ('sheet-2.jpg', 2, 3, ['thumbs', 'trophy', 'idea', 'oops', 'gasp', 'sleep'], 'thumbs'),
    ('sheet-3.jpg', 1, 4, ['read', 'search', 'write', 'listen'], 'read'),
    ('sheet-4.jpg', 1, 4, ['speak', 'trace', 'tap', 'marble'], 'tap'),
    ('sheet-5.jpg', 1, 4, ['lantern', 'map', 'water', 'hike'], 'map'),
    ('sheet-6.jpg', 1, 4, ['shiver', 'telescope', 'compass', 'basket'], 'basket'),
    ('sheet-7.jpg', 1, 4, ['love', 'proud', 'laugh', 'calm'], 'proud'),
    ('sheet-8.jpg', 1, 4, ['sit', 'point', 'run', 'peek'], 'point'),
]
# A pose stands on the bottom of its picture unless it says otherwise here.
#   'top'  the leaf tips are the top of the picture and the feet are off the ground (a jump)
AIRBORNE = {'cheer'}
# Where Root is sitting, as a fraction of a standing Root's height above the lowest point of the picture.
SEAT = {'sit': 0.2}

OBJECTS = [
    ('objects-keepsakes.jpg', 2, 3, ['keepsake-garden', 'keepsake-orchard', 'keepsake-market', 'keepsake-woods', 'keepsake-harbour', 'keepsake-summit'], 420),
    ('objects-journey.jpg', 2, 3, ['obj-sprout', 'obj-magnifier', 'obj-pencil', 'obj-sand', 'obj-flag', 'obj-book'], 320),
]


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
            if len(comp) < 260 and rim and np.mean([c.max() for c in rim]) > 190 and np.mean([c[2] for c in rim]) < 150 and np.mean([c[1] for c in rim]) < 190:
                for y, x in comp:
                    bg[y, x] = True
    return bg


def pieces(fg):
    """The separate blobs of a sheet: a list of (pixel count, row centroid, column centroid, label), and the label image."""
    h, w = fg.shape
    label = np.zeros((h, w), np.int32)
    out = []
    n = 0
    for sy in range(h):
        row = fg[sy]
        for sx in np.nonzero(row & (label[sy] == 0))[0]:
            if label[sy, sx]:
                continue
            n += 1
            label[sy, sx] = n
            todo = deque([(sy, sx)])
            count = ys = xs = 0
            while todo:
                y, x = todo.popleft()
                count += 1; ys += y; xs += x
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not label[ny, nx]:
                        label[ny, nx] = n; todo.append((ny, nx))
            out.append((count, ys / count, xs / count, n))
    return out, label


def cut_sheet(name, rows, cols):
    """Every figure on a sheet, in reading order, as RGBA pictures."""
    im = Image.open(os.path.join(HERE, 'originals', name)).convert('RGB')
    rgb = np.asarray(im).astype(np.float32)
    bg = background(rgb)
    blobs, label = pieces(~bg)
    cells = {}
    for count, cy, cx, n in blobs:
        if count < 14:
            continue  # a speck
        cell = (min(rows - 1, int(cy * rows / im.height)), min(cols - 1, int(cx * cols / im.width)))
        cells.setdefault(cell, []).append(n)
    out = []
    for r in range(rows):
        for c in range(cols):
            mine = np.isin(label, cells.get((r, c), []))
            ys, xs = np.where(mine)
            y0, y1, x0, x1 = max(0, ys.min() - PAD), min(im.height, ys.max() + 1 + PAD), max(0, xs.min() - PAD), min(im.width, xs.max() + 1 + PAD)
            part, solid_np = rgb[y0:y1, x0:x1], mine[y0:y1, x0:x1]
            # Solid inside, clear outside, and a soft one-pixel edge between them.
            solid = Image.fromarray((solid_np * 255).astype(np.uint8))
            alpha = np.asarray(solid.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))).astype(np.float32) / 255
            # The outermost pixels were blended with the white sheet. Take the white back out, using the colour
            # just inside the edge, so nothing pale is left around the outline.
            inner = np.asarray(Image.fromarray(part.astype(np.uint8)).filter(ImageFilter.MinFilter(5))).astype(np.float32)
            edge = np.asarray(solid.filter(ImageFilter.MinFilter(7))).astype(np.float32) / 255 < 0.5
            paint = np.where(edge[..., None], inner, part)
            out.append(Image.fromarray(np.dstack([paint, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA'))
    return out


def save(im, path):
    im.save(path, 'WEBP', quality=92, method=6, alpha_quality=100)


def main():
    mascot = os.path.join(ROOT, 'assets', 'mascot')
    os.makedirs(mascot, exist_ok=True)
    rows_ts, tiles, names = [], [], []
    for sheet, rows, cols, poses, standing in POSES:
        cuts = dict(zip(poses, cut_sheet(sheet, rows, cols)))
        stand = cuts[standing].height - 2 * PAD   # leaf tips to soles on this sheet, in its own pixels
        for pose, im in cuts.items():
            save(im, os.path.join(mascot, pose + '.webp'))
            h, w = im.height, im.width
            # The ground line, as a fraction of the picture height from the top.
            base = (PAD + stand) / h if pose in AIRBORNE else (h - PAD) / h
            a = np.asarray(im)[:, :, 3]
            # The middle of the head, sideways: the forehead band, which a raised hand rarely reaches.
            band = a[max(0, int(base * h - stand * 0.76)):max(1, int(base * h - stand * 0.66))]
            xs = np.where(band.max(axis=0) > 128)[0]
            cx = (xs.min() + xs.max()) / 2 / w if len(xs) else 0.5
            extra = ', seat: %.4f' % (base - SEAT[pose] * stand / h) if pose in SEAT else ''
            rows_ts.append("  %s: { src: require('../../assets/mascot/%s.webp'), w: %d, h: %d, stand: %.4f, base: %.4f, aspect: %.3f, face: %.4f, cx: %.4f%s },"
                           % (pose, pose, w, h, stand / h, base, (w - 2 * PAD) / stand, base - 0.53 * stand / h, cx, extra))
            names.append(pose)
            # for the contact sheet: every pose at the same scale, standing on the same line
            k = 300 / stand
            tiles.append((pose, im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS), round((base * h) * k)))
        print('%-12s %s' % (sheet, ' '.join(poses)))

    ts = """// GENERATED by tools/mascot/cut.py. Do not edit by hand: change POSES there and run it again.
//
// One entry per picture of Root. w × h is the picture in pixels. Fractions are of the picture's height, from the top:
//   stand  the height of a standing Root, leaf tips to soles: what a Mascot `size` maps to. Root is the same size
//          whichever picture is showing.
//   base   the ground line. It is the bottom of the layout box. (For a jump it lies below the feet.)
//   seat   (sit only) the line Root is sitting on
//   face   the middle of the face, and `cx` the middle of the head sideways as a fraction of the width: for the round avatar crop
// `aspect` is the layout box's width over its height.

export type Pose = %s;

export type Still = { src: number; w: number; h: number; stand: number; base: number; aspect: number; face: number; cx: number; seat?: number };

export const STILLS: Record<Pose, Still> = {
%s
};
""" % (' | '.join("'%s'" % p for p in names), '\n'.join(rows_ts))
    open(os.path.join(ROOT, 'src', 'components', 'mascotStills.ts'), 'w').write(ts)

    props = os.path.join(ROOT, 'assets', 'props')
    for sheet, rows, cols, objs, size in OBJECTS:
        for name, im in zip(objs, cut_sheet(sheet, rows, cols)):
            # every object on a square canvas, so the app can lay them out without knowing their shapes
            k = (size - 16) / max(im.size)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            sq = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            sq.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
            save(sq, os.path.join(props, name + '.webp'))
        print('%-12s %s' % (sheet, ' '.join(objs)))

    valley = cut_sheet('scene-valley.jpg', 1, 1)[0]
    k = 760 / valley.width
    valley = valley.resize((760, round(valley.height * k)), Image.LANCZOS)
    save(valley, os.path.join(ROOT, 'assets', 'scenes', 'valley.webp'))
    print('valley       %dx%d' % valley.size)

    # contact sheet: every pose on the app's periwinkle, to check the outlines and that Root is one size
    per = 9
    cell_w, cell_h = 330, 430
    n_rows = -(-len(tiles) // per)
    sheet_im = Image.new('RGB', (per * cell_w, n_rows * cell_h), (157, 183, 255))
    for i, (pose, t, ground) in enumerate(tiles):
        x = (i % per) * cell_w + (cell_w - t.width) // 2
        y = (i // per) * cell_h + cell_h - 30 - ground
        sheet_im.paste(t, (x, y), t)
    sheet_im.save(os.path.join(HERE, 'contact.jpg'), quality=88)


if __name__ == '__main__':
    sys.exit(main())
