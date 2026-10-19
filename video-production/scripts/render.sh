#!/bin/bash
# Resumable chunked Remotion render. Run from the Remotion project root, in the FOREGROUND.
# usage: render.sh <CompositionId> <totalFrames> <audio.wav> <out.mp4> [chunkFrames=30]
# Delete out/chunks/cN.mp4 to re-render only second N (with 30-frame chunks at 30 fps).
set -e
COMP=$1; TOTAL=$2; AUDIO=$3; OUT=$4; CH=${5:-30}
CONC=$(awk '{ if ($1=="max") print 2; else printf "%d", ($1/$2 < 1 ? 1 : $1/$2) }' /sys/fs/cgroup/cpu.max 2>/dev/null || echo 2)
[ -d build ] || npx remotion bundle src/index.ts --out-dir=build --log=error
mkdir -p out/chunks
N=$(( (TOTAL + CH - 1) / CH ))
for c in $(seq 0 $((N-1))); do
  a=$((c*CH)); b=$((a+CH-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  f=out/chunks/c$c.mp4
  [ -f $f ] && continue
  npx remotion render build $COMP out/chunks/tmp$c.mp4 --frames=$a-$b --concurrency=$CONC --crf=14 --muted --log=error
  mv out/chunks/tmp$c.mp4 $f
  echo "chunk $c/$N $(date +%T)"
done
for c in $(seq 0 $((N-1))); do echo "file 'chunks/c$c.mp4'"; done > out/list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i out/list.txt -i "$AUDIO" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"
# under 25 MB so it can be shown in the conversation
ffmpeg -loglevel error -y -i "$OUT" -c:v libx264 -preset slow -b:v 7M -maxrate 8M -bufsize 14M -pix_fmt yuv420p -c:a copy -movflags +faststart "${OUT%.mp4}-share.mp4"
echo ALLDONE
