import subprocess, sys, wave
import numpy as np
SR = 48000
# usage: extend.py <src> <phase of first kick in src> <out.wav> [bpm=120] [seconds=20]
# Output grid: first beat at -0.016 s → music.json {"bpm": <bpm>, "b0": -0.016}
src, offset, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
bpm = float(sys.argv[4]) if len(sys.argv) > 4 else 120.0
secs = float(sys.argv[5]) if len(sys.argv) > 5 else 20.0
BAR = 4 * 60 / bpm
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2)
g = -0.016  # target grid: bars at g + BAR*k
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
y = y[:int(secs * SR)]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print(out, len(y) / SR)
