#!/bin/bash
# Download the two fonts the template uses (both SIL Open Font License):
#   Hand  = Gaegu Bold (captions; Latin only - letters it lacks, e.g. Czech diacritics, fall back to Label)
#   Label = Patrick Hand (label boxes; Latin + Latin Extended)
# usage: fetch_fonts.sh <project_dir>      writes <project_dir>/fonts/*.woff2
set -e
if [ $# -lt 1 ]; then sed -n '2,6p' "$0"; exit 1; fi
mkdir -p "$1/fonts"
CDN=https://cdn.jsdelivr.net/npm/@fontsource
curl -sSfL -o "$1/fonts/gaegu-latin-700.woff2" "$CDN/gaegu@5.2.5/files/gaegu-latin-700-normal.woff2"
for sub in latin latin-ext; do
  curl -sSfL -o "$1/fonts/patrick-hand-$sub-400.woff2" "$CDN/patrick-hand@5.2.5/files/patrick-hand-$sub-400-normal.woff2"
done
ls -la "$1/fonts"
