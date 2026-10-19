#!/usr/bin/env bash
# Render chosen frames of a Remotion bundle and tile them into one contact sheet, to check
# frame 0, the middle of every morph, caption changes and the CTA without rendering the video.
# usage: sheet.sh <bundle-dir> <composition-id> <out.png> <frame> [frame ...]
#   env: SCALE (default 0.25), COLS (default 10), CHROME_PATH (browser for Remotion, optional)
# Run from the Remotion project root after `npx remotion bundle src/index.ts --out-dir=<bundle-dir>`.
set -euo pipefail
if [ $# -lt 4 ]; then sed -n '2,6p' "$0"; exit 1; fi
BUNDLE=$1; COMP=$2; OUT=$3; shift 3
SCALE=${SCALE:-0.25}; COLS=${COLS:-10}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
BROWSER=()
[ -n "${CHROME_PATH:-}" ] && BROWSER=(--browser-executable="$CHROME_PATH")
n=0
for fr in "$@"; do
  npx remotion still "$BUNDLE" "$COMP" "$TMP/$(printf %03d $n).png" --frame="$fr" --scale="$SCALE" "${BROWSER[@]}" >"$TMP/log" 2>&1 \
    || { cat "$TMP/log"; exit 1; }
  n=$((n + 1))
done
ROWS=$(( (n + COLS - 1) / COLS ))
[ "$n" -lt "$COLS" ] && COLS=$n
ffmpeg -loglevel error -y -framerate 1 -i "$TMP/%03d.png" -vf "tile=${COLS}x${ROWS}:padding=6:color=white" -frames:v 1 "$OUT"
echo "$OUT ($n frames)"
