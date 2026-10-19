# Find the ~20 s window of a long song with the clearest, strongest beat, then refine the BPM there.
# usage: python3 section.py <song> [bpm] [window_s=20]
#   bpm: tempo from beats.py (searched ±1.5 BPM around it); without it, 110-150 BPM is scanned (slower).
# Prints the best windows (start, kick contrast, kick/full-band phase, loudness) and a refined BPM + phase.
import subprocess, sys

if len(sys.argv) < 2:
    sys.exit('usage: python3 section.py <song> [bpm] [window_s=20]   (needs numpy and ffmpeg)')
import numpy as np
SR, HOP, WIN = 22050, 256, 1024
path = sys.argv[1]
bpm0 = float(sys.argv[2]) if len(sys.argv) > 2 else None
T = float(sys.argv[3]) if len(sys.argv) > 3 else 20.0

x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout, np.float32)
fps = SR / HOP
win = np.hanning(WIN)
n = (len(x) - WIN) // HOP
S = np.log1p(np.abs(np.array([np.fft.rfft(x[i * HOP:i * HOP + WIN] * win) for i in range(n)])) * 20)
flux = np.maximum(S[1:] - S[:-1], 0)
kick, full = flux[:, :10].sum(1), flux.sum(1)
rms = np.sqrt(np.convolve(x ** 2, np.ones(SR) / SR, 'same'))[::HOP][:len(kick)]


def best(f, t0, bpms):
    seg = f[int(t0 * fps):int((t0 + T) * fps)]
    seg = seg - seg.mean()
    out = (-1.0, 0.0, 0.0)
    for bpm in bpms:
        per = 60 / bpm
        for ph in np.arange(0, per, per / 48):
            idx = (np.arange(ph, T, per) * fps).astype(int)
            idx = idx[idx < len(seg)]
            s = seg[idx].mean()
            if s > out[0]:
                out = (s, bpm, ph)
    return out


if bpm0 is None:
    bpm0 = best(kick, 0, np.arange(110, 150, 0.25))[1] if len(x) / SR > T else 120
    print('estimated bpm %.2f' % bpm0)
res = []
for t0 in np.arange(0, len(x) / SR - T, 2.0):
    sk, _, pk = best(kick, t0, [bpm0])
    _, _, pf = best(full, t0, [bpm0])
    seg = kick[int(t0 * fps):int((t0 + T) * fps)]
    res.append((sk / (seg.std() + 1e-9), t0, pk, pf, rms[int(t0 * fps):int((t0 + T) * fps)].mean()))
res.sort(reverse=True)
for r in res[:8]:
    print('start %6.1f s  kick-contrast %.2f  kick-phase %.3f  full-phase %.3f  rms %.3f' % (r[1], r[0], r[2], r[3], r[4]))
t0 = res[0][1]
_, b, p = best(kick, t0, np.arange(bpm0 - 1.5, bpm0 + 1.5, 0.05))
per = 60 / b
print('refined bpm %.2f, first beat of that window at %.3f s' % (b, t0 + p))
print('cut the excerpt on a beat, e.g. ffmpeg -ss %.3f ..., then music.json = {"bpm": %.2f, "b0": 0}' % (t0 + p, b))
print('(cutting at any other start S: b0 = (%.3f - S) mod %.4f)' % (t0 + p, per))
