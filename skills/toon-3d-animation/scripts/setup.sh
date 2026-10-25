#!/bin/bash
# Start a toon story project: copy the template and download what it needs (three.js r170 + RoundedBoxGeometry,
# MIT; Inter variable font, SIL OFL) into it.
# usage: setup.sh <project_dir>
set -e
if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then sed -n '2,4p' "$0"; [ $# -lt 1 ] && exit 1 || exit 0; fi
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; P="$1"
mkdir -p "$P/lib" "$P/fonts"
for f in index.html toon.js props.js story.js timeline.json sheet.html sheet.js; do [ -e "$P/$f" ] || cp "$SKILL/template/$f" "$P/$f"; done
get() { [ -s "$2" ] || curl -sSfL -o "$2" "$1"; }
get https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js "$P/lib/three.module.js"
get https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js "$P/lib/RoundedBoxGeometry.js"
get https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.0.8/files/inter-latin-wght-normal.woff2 "$P/fonts/inter-latin.woff2"
get https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.0.8/files/inter-latin-ext-wght-normal.woff2 "$P/fonts/inter-latin-ext.woff2"
echo "ready: $P  (render a still: node $SKILL/scripts/render.mjs $P/index.html $P/stills --frames 24,120 --fps 24;"
echo "  the model sheet of the cast: node $SKILL/scripts/render.mjs $P/sheet.html $P/sheet --fps 1 --frames 0,1,2,3,4,5,6,7)"
