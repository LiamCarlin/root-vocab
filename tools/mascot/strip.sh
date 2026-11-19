#!/bin/bash
# ./strip.sh clip [clip …]  → out/strip_<clip>.jpg (8 poses side by side)
cd "$(dirname "$0")"
blender -b --python render.py -- --strip 8 "$@" 2>&1 | grep -E "DONE|Error|Traceback|rror:|line [0-9]+" 
for c in "$@"; do python3 sheet.py out/strip_$c.jpg out/strip/$c/f*.png --h 300 >/dev/null; done
