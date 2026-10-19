"""Energy per beat and per bar of a track: find the downbeat, the lifts/drops, and where to cut the excerpt.

usage: python3 bars.py <audio> <bpm> [--phase P] [--land BEAT] [--dur 20]

  bpm       tempo from beats.py / section.py
  --phase   time of any beat in the file (s); default: estimated from the low band
  --land    beat of your video timeline where the strongest lift should land (e.g. 16 = the biggest transition)
  --dur     length of the excerpt you need (s), so the suggested cut stays inside the file

Prints one row per bar (low = kick/bass band, mid = the rest, relative to the track's mean), marks the
guessed downbeat and every lift (a bar clearly louder in the low band than the two before), then suggests
an excerpt start and the music.json for it.

music.json convention used by both video skills: {"bpm": <tempo>, "b0": <seconds>}, where b0 is the time of
beat 0 *in the excerpt that plays in the video*. Cut the excerpt exactly on a beat and b0 is 0.
"""
import subprocess, sys

if len(sys.argv) < 3 or sys.argv[1] in ('-h', '--help'):
    print(__doc__)
    sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help') else 1)
import numpy as np

args = sys.argv[1:]
opt = {}
for k in ('--phase', '--land', '--dur'):
    if k in args:
        i = args.index(k); opt[k] = float(args[i + 1]); del args[i:i + 2]
path, bpm = args[0], float(args[1])
SR, HOP, WIN = 22050, 256, 2048
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                                 capture_output=True).stdout, np.float32)
dur = len(x) / SR
per = 60 / bpm
fps = SR / HOP
n = (len(x) - WIN) // HOP
win = np.hanning(WIN)
spec = np.abs(np.array([np.fft.rfft(x[i * HOP:i * HOP + WIN] * win) for i in range(n)]))
freqs = np.fft.rfftfreq(WIN, 1 / SR)
low = spec[:, freqs < 150].sum(1)
mid = spec[:, (freqs >= 150) & (freqs < 4000)].sum(1)

if '--phase' in opt:
    phase = opt['--phase'] % per
else:  # the phase whose beat grid catches the most low-band onsets
    flux = np.maximum(np.diff(np.log1p(low), prepend=0), 0)
    cands = np.arange(0, per, per / 64)
    score = [flux[np.clip((np.arange(p, dur, per) * fps).astype(int), 0, n - 1)].mean() for p in cands]
    phase = cands[int(np.argmax(score))]

beats = np.arange(phase, dur - per, per)
def band(e, t):
    a, b = int(t * fps), int((t + per) * fps)
    return e[a:b].mean() if b > a else 0
lb = np.array([band(low, t) for t in beats]); mb = np.array([band(mid, t) for t in beats])
lb /= lb.mean() + 1e-9; mb /= mb.mean() + 1e-9

# downbeat: the beat offset (0-3) whose beats carry the most low-band energy
off = int(np.argmax([lb[o::4].mean() for o in range(4)]))
first_bar = phase + off * per
bars = [(k, first_bar + k * 4 * per) for k in range(int((dur - first_bar) / (4 * per)))]
bl = [lb[off + 4 * k: off + 4 * k + 4].mean() for k, _ in bars]
bm = [mb[off + 4 * k: off + 4 * k + 4].mean() for k, _ in bars]
lifts = [k for k in range(2, len(bars)) if bl[k] > 1.2 * max(bl[k - 1], bl[k - 2]) and bl[k] > 0.9]

print(f'{path}: {dur:.1f} s, {bpm:.2f} BPM, beat {per:.4f} s, first beat {phase:.3f} s, downbeat = beat offset {off}')
print('bar   start s   low   mid')
for (k, t), l, m in zip(bars, bl, bm):
    print(f'{k:3d}  {t:7.2f}   {l:4.2f}  {m:4.2f}  {"#" * int(l * 10):<20}{"  <- lift" if k in lifts else ""}')

need = opt.get('--dur', 20.0)
if '--land' in opt:
    land = opt['--land']
    ok = [k for k in sorted(lifts, key=lambda k: -bl[k]) if 0 <= bars[k][1] - land * per and bars[k][1] - land * per + need <= dur]
    if ok:
        k = ok[0]; start = bars[k][1] - land * per
        print(f'\nstrongest usable lift: bar {k} at {bars[k][1]:.2f} s -> cut the excerpt at {start:.3f} s'
              f' (ffmpeg -ss {start:.3f} -t {need:g}); the lift is then video beat {land:g}')
        print(f'music.json = {{"bpm": {bpm:g}, "b0": 0}}')
    else:
        print(f'\nno lift fits beat {land:g} with {need:g} s of music after it; pick another --land or a shorter --dur')
else:
    print(f'\ncut on a bar line (any "start s" above) and use music.json = {{"bpm": {bpm:g}, "b0": 0}}')
