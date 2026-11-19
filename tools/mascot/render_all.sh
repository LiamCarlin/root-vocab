#!/bin/bash
# Render stills of Root and the keepsake objects, then rebuild the WebP files, src/components/mascotStills.ts
# and the contact sheets.
#
#   ./render_all.sh                 every pose and every keepsake
#   ./render_all.sh map hike        only these poses (the keepsakes are skipped)
#
# Needs Blender 4.2+ on the PATH and Python 3 with Pillow. Two switches, both environment variables:
#   ENGINE=CYCLES        for a machine without a GPU (headless Linux): EEVEE, the default, cannot start there
#   BPY_PYTHON=path      a Python that has the pip `bpy` module, used instead of the blender command
# so on a headless box:  ENGINE=CYCLES BPY_PYTHON=~/bvenv/bin/python ./render_all.sh
set -e
cd "$(dirname "$0")"
ENGINE=${ENGINE:-BLENDER_EEVEE}
if [ -n "$BPY_PYTHON" ]; then RENDER=("$BPY_PYTHON" render.py); PY="$BPY_PYTHON"; else RENDER=(blender -b --python render.py); PY=python3; fi
KEEPSAKES=0
if [ $# -eq 0 ]; then
  KEEPSAKES=1
  set -- $("$PY" -c "import clips; print(' '.join(clips.CLIPS))")
fi
rm -rf out/stills out/keepsakes
mkdir -p out
N=$(( ($# + 2) / 3 ))     # three processes side by side
for k in 0 1 2; do
  PART=("${@:$((k * N + 1)):$N}")
  [ ${#PART[@]} -gt 0 ] && "${RENDER[@]}" -- --still --engine "$ENGINE" "${PART[@]}" > out/render$k.log 2>&1 &
done
wait
[ $KEEPSAKES -eq 1 ] && "${RENDER[@]}" -- --keepsake --engine "$ENGINE" all > out/render_keepsakes.log 2>&1
grep -h DONE out/render*.log
"$PY" pack.py
