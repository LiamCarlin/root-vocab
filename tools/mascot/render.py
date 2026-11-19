"""
blender -b --python render.py -- [--still | --draft | --keepsake] [--engine CYCLES] name [name …] | all
(or, without Blender installed:  python render.py -- …  in a Python that has the `bpy` module)

--still     (default) each pose at double size      → out/stills/<pose>.png   (then run pack.py)
--draft     each pose at single size, fewer samples → out/draft/<pose>.png    (a quick look while posing)
--keepsake  the keepsake objects on their own, 512 px → out/keepsakes/keepsake-<id>.png  (pack.py converts them)
--engine    BLENDER_EEVEE (default; needs a GPU) or CYCLES (works anywhere, slower)
"""
import sys, os, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rootrig as R
import clips as C

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
draft, keepsake = '--draft' in args, '--keepsake' in args
engine = 'BLENDER_EEVEE'
if '--engine' in args:
    i = args.index('--engine'); engine = args[i + 1]; del args[i:i + 2]
names = [a for a in args if not a.startswith('--')]
registry = C.KEEPSAKES if keepsake else C.CLIPS
if not names or names == ['all']:
    names = list(registry)
unknown = [n for n in names if n not in registry]
if unknown:
    sys.exit('unknown %s: %s' % ('keepsake' if keepsake else 'pose', ' '.join(unknown)))

R.build(engine, 24 if draft else (96 if keepsake else 64))
t0 = time.time()
for name in names:
    if keepsake:
        k = C.KEEPSAKES[name]
        R.solo(k['prop'], k.get('rot', (0, 0, 0)), 256 if draft else 512, k.get('pad', 0.07), k.get('extra', ()), k.get('scale', 1.0))
        R.render(os.path.join(HERE, 'out', 'draft' if draft else 'keepsakes', 'keepsake-%s.png' % name))
    else:
        cl = C.CLIPS[name]
        R.frame(cl.w, cl.h, cl.bottom, C.PX * (1 if draft else 2))
        R.apply(C.sample(name, cl.hold))
        R.render(os.path.join(HERE, 'out', 'draft' if draft else 'stills', name + '.png'))
    print('DONE', name, round(time.time() - t0, 1), 's', flush=True)
