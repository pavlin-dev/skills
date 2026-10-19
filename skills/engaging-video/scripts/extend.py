# Extend a too-short track by repeating whole bars on the bar grid (short crossfades).
# usage: python3 extend.py <src> <phase_s> <out.wav> [bpm=120] [seconds=20] [grid_s=0]
#   phase_s  time of a downbeat in <src> (from beats.py)
#   grid_s   where bar lines should land in the output (usually 0 or slightly negative)
# Keeps bars 0-8 of the source, then appends bars 4-6 and 6-8 again, then trims to <seconds>.
import subprocess, sys, wave
import numpy as np
if len(sys.argv) < 4:
    sys.exit('usage: extend.py <src> <phase_s> <out.wav> [bpm=120] [seconds=20] [grid_s=0]')
SR = 48000
src, offset, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
bpm = float(sys.argv[4]) if len(sys.argv) > 4 else 120.0
seconds = float(sys.argv[5]) if len(sys.argv) > 5 else 20.0
g = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
BAR = 4 * 60 / bpm
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2)
s0 = int((offset - g) * SR)  # shift so source bar lines land on the target grid
x = x[s0:] if s0 > 0 else np.vstack([np.zeros((-s0, 2), np.float32), x])
bar = lambda k: int((g + BAR * k) * SR)
head = x[:bar(8)]
tail = x[bar(4):bar(6)]
tail2 = x[bar(6):bar(8)]
f = int(0.012 * SR)
def join(a, c):
    r = np.linspace(0, 1, f)[:, None]
    return np.vstack([a[:-f], a[-f:] * (1 - r) + c[:f] * r, c[f:]])
y = join(join(head, tail), tail2)
y = y[:int(seconds * SR)]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print(out, len(y) / SR)
