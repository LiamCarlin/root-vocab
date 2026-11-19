"""blender -b --python lookdev.py -- [EEVEE|CYCLES]   → out/look_*.png (turnaround + face close-up)"""
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rootrig as R
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
eng = 'CYCLES' if 'CYCLES' in args else 'BLENDER_EEVEE'
R.build(eng, 64)
out = os.path.join(HERE, 'out')
R.frame(3.0, 3.7, -0.15, 200)
for name, over in (('front', {}), ('q', {'yaw': 35}), ('side', {'yaw': 90}), ('back', {'yaw': 180})):
    if args and name not in args and 'all' not in args and name != 'front':
        continue
    R.apply(R.pose(**over)); R.render(os.path.join(out, 'look_%s.png' % name))
if 'face' in args or 'all' in args:
    R.apply(R.pose()); R.frame(2.0, 1.7, 1.0, 330); R.render(os.path.join(out, 'look_face.png'))
