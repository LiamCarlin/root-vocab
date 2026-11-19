#!/bin/bash
# Re-render every clip of Root and rebuild the sprite sheets, stills and src/components/mascotClips.ts.
# Needs Blender 4.2+ on the PATH and Python 3 with Pillow. Takes about five minutes on an M-series Mac.
set -e
cd "$(dirname "$0")"
rm -rf out/frames out/stills
ALL=$(python3 -c "import clips; print(' '.join(clips.CLIPS))")
set -- $ALL
N=$(( ($# + 2) / 3 ))
blender -b --python render.py -- "${@:1:$N}" > out_r1.log 2>&1 &
blender -b --python render.py -- "${@:$((N + 1)):$N}" > out_r2.log 2>&1 &
blender -b --python render.py -- "${@:$((2 * N + 1))}" > out_r3.log 2>&1 &
wait
blender -b --python render.py -- --still all > out_r4.log 2>&1
rm -f out_r*.log
python3 pack.py
