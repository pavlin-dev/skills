#!/bin/bash
# Start a project in the storytime look: the toon-3d-animation toolkit (its setup.sh) plus this look's files
# (look.js, a face sheet, an example prison cell).
# usage: setup.sh <project_dir>
set -e
if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then sed -n '2,4p' "$0"; [ $# -lt 1 ] && exit 1 || exit 0; fi
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; BASE="${TOON3D_DIR:-$SKILL/../toon-3d-animation}"; P="$1"
[ -f "$BASE/scripts/setup.sh" ] || { echo "toon-3d-animation not found next to this skill; set TOON3D_DIR to its folder" >&2; exit 1; }
bash "$BASE/scripts/setup.sh" "$P"
for f in look.js faces.html faces.js cell.html cell.js; do [ -e "$P/$f" ] || cp "$SKILL/template/$f" "$P/$f"; done
echo "storytime look added: faces  node $BASE/scripts/render.mjs $P/faces.html $P/faces --fps 1 --frames 0,1,2,3,4,5,6,7"
echo "                      cell   node $BASE/scripts/render.mjs $P/cell.html $P/cell --fps 24 --frames 12"
