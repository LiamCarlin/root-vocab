"""
blender -b --python render.py -- [--strip N] [--still] [--engine CYCLES] clip [clip …] | all

Renders each clip's frames to out/frames/<clip>/f###.png.
--strip N renders only N evenly spaced frames at half size to out/strip/ (a quick pose check).
--still   renders each clip's hold frame at double size to out/stills/<clip>.png.
"""
import sys, os, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rootrig as R
import clips as C

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
strip = int(args[args.index('--strip') + 1]) if '--strip' in args else 0
still = '--still' in args
engine = args[args.index('--engine') + 1] if '--engine' in args else 'BLENDER_EEVEE'
skip = set()
for flag in ('--strip', '--engine'):
    if flag in args:
        i = args.index(flag); skip.update((i, i + 1))
names = [a for i, a in enumerate(args) if i not in skip and not a.startswith('--')]
if not names or names == ['all']:
    names = list(C.CLIPS)

R.build(engine, 32 if strip else 64)
t0 = time.time()
for name in names:
    cl = C.CLIPS[name]
    scale = 0.5 if strip else (2.0 if still else 1.0)
    R.frame(cl.w, cl.h, cl.bottom, C.PX * scale)
    if still:
        R.apply(C.sample(name, cl.hold)); R.render(os.path.join(HERE, 'out', 'stills', name + '.png')); continue
    frames = [round(k * cl.frames / strip) % cl.frames for k in range(strip)] if strip else range(cl.frames)
    for i in frames:
        R.apply(C.sample(name, i))
        R.render(os.path.join(HERE, 'out', 'strip' if strip else 'frames', name, 'f%03d.png' % i))
    print('DONE', name, round(time.time() - t0, 1), 's', flush=True)
