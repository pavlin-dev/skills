#!/bin/bash
# Resumable chunked Remotion render. Run from the Remotion project root, in the FOREGROUND.
# usage: render.sh <CompositionId> <totalFrames> <audio.wav|none> <out.mp4> [chunkFrames=30]
#   audio "none": video only (mux the final mix later, e.g. with the sound-design skill's mix.py --video)
# Delete out/chunks/cN.mp4 to re-render only second N (with 30-frame chunks at 30 fps).
# env: CHROME_PATH  browser for Remotion (e.g. a chrome-headless-shell binary; recent Chromium has no old headless mode)
#      CONCURRENCY  render threads (default: cgroup CPU quota, else nproc)
#      LOUDNORM=0   keep the audio level as is (when the mix is already normalized, e.g. by sfx_mix.py)
set -e
if [ $# -lt 4 ]; then sed -n '2,5p' "$0"; exit 1; fi
COMP=$1; TOTAL=$2; AUDIO=$3; OUT=$4; CH=${5:-30}
# Concurrency: $CONCURRENCY, else the cgroup CPU quota (containers often allow fewer CPUs than nproc shows), else nproc.
NPROC=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)
CONC=${CONCURRENCY:-$(awk -v n="$NPROC" '{ if ($1=="max") print n; else printf "%d", ($1/$2 < 1 ? 1 : $1/$2) }' /sys/fs/cgroup/cpu.max 2>/dev/null || true)}
CONC=${CONC:-$NPROC}
[ -d build ] || npx remotion bundle src/index.ts --out-dir=build --log=error
mkdir -p out/chunks
N=$(( (TOTAL + CH - 1) / CH ))
for c in $(seq 0 $((N-1))); do
  a=$((c*CH)); b=$((a+CH-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  f=out/chunks/c$c.mp4
  [ -f $f ] && continue
  npx remotion render build $COMP out/chunks/tmp$c.mp4 --frames=$a-$b --concurrency=$CONC --crf=14 --muted --log=error ${CHROME_PATH:+--browser-executable="$CHROME_PATH"}
  mv out/chunks/tmp$c.mp4 $f
  echo "chunk $c/$N $(date +%T)"
done
for c in $(seq 0 $((N-1))); do echo "file 'chunks/c$c.mp4'"; done > out/list.txt
AF="loudnorm=I=-14:TP=-1.5:LRA=11"; [ "${LOUDNORM:-1}" = 0 ] && AF="anull"
if [ "$AUDIO" = none ]; then
  ffmpeg -loglevel error -y -f concat -safe 0 -i out/list.txt -map 0:v \
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "$OUT"
else
  ffmpeg -loglevel error -y -f concat -safe 0 -i out/list.txt -i "$AUDIO" -map 0:v -map 1:a \
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
    -af "$AF" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"
fi
# smaller copy (~7 Mbit/s) for previews and chat/file-size limits; flat motion graphics are often smaller already
BR=$(ffprobe -v error -show_entries format=bit_rate -of csv=p=0 "$OUT" 2>/dev/null || echo 0)
if [ "${BR:-0}" -gt 8000000 ] 2>/dev/null; then
  ffmpeg -loglevel error -y -i "$OUT" -c:v libx264 -preset slow -b:v 7M -maxrate 8M -bufsize 14M -pix_fmt yuv420p $([ "$AUDIO" = none ] && echo -an || echo -c:a copy) -movflags +faststart "${OUT%.mp4}-share.mp4"
else
  echo "main file is $((BR / 1000)) kbit/s, no -share copy needed"
fi
echo ALLDONE
