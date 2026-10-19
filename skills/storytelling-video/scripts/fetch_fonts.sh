#!/bin/bash
# Download the handwriting font (Caveat, SIL Open Font License) the pen template uses, with Czech/latin-ext glyphs.
# usage: fetch_fonts.sh <project_dir>      writes <project_dir>/fonts/caveat-latin{,-ext}-600.woff2
set -e
if [ $# -lt 1 ]; then sed -n '2,3p' "$0"; exit 1; fi
mkdir -p "$1/fonts"
for sub in latin latin-ext; do
  curl -sSfL -o "$1/fonts/caveat-$sub-600.woff2" "https://cdn.jsdelivr.net/npm/@fontsource/caveat@5.0.8/files/caveat-$sub-600-normal.woff2"
done
ls -la "$1/fonts"
