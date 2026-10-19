#!/usr/bin/env python3
"""Cut an existing music track to the story: sections that start on a downbeat, tape-stops,
drop-outs and muffled (low-passed) stretches. It never generates music, it only edits a track.

usage: music_edit.py track.mp3 edit.json out.wav

edit.json:
  {"bpm": 110, "phase": 0.528, "duration": 40.3,
   "sections": [
     {"at": 0,    "bar": 19, "until": 3.9,  "end": "tape"},
     {"at": 4.67, "bar": 23, "until": 29.2, "end": "fade", "muffle": [[15.3, 29.2]]},
     {"at": 35.2, "bar": 40, "until": 40.3, "end": "fade", "fade": 1.4}
   ]}

  bpm, phase   the track's tempo and the time of its first beat (measure them, e.g. with the
               engaging-video skill's scripts/beats.py)
  duration     length of the output in seconds
  at, until    where the section plays in the OUTPUT (seconds); put `at` on the first word of
               the line the music should land on, so the downbeat hits that word
  bar          bar of the TRACK the section starts from (bar k starts at phase + k*4*60/bpm)
  end          "fade" (default, --fade seconds, default 0.25), "tape" (playback slows to a stop
               over 0.7 s, for a breakdown or a failure) or "cut" (10 ms)
  muffle       output time ranges played through a low-pass (--cutoff, default 700 Hz) with
               0.3 s crossfades: distance, a suspended moment, "heard from outside"
Gaps between sections are silence: use them before a punchline or after a disaster.

Needs: ffmpeg, `pip install numpy`.
"""
import json, subprocess, sys, wave

if len(sys.argv) < 4 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help') else 1)
import numpy as np

track, edit_path, out_path = sys.argv[1:4]
E = json.load(open(edit_path))
SR = 48000
src = np.frombuffer(subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', track, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']),
                    np.float32).astype(np.float64)
N = int(E['duration'] * SR); out = np.zeros(N)
bar = 4 * 60 / E['bpm']

def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / (1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def ramp(n, up=True):
    r = np.linspace(0, 1, max(n, 1)); return r if up else r[::-1]

for s in E['sections']:
    at, until = float(s['at']), float(s.get('until', E['duration']))
    s0 = int((E.get('phase', 0) + int(s.get('bar', 0)) * bar) * SR)
    seg = src[s0:s0 + int((until - at) * SR)].copy()
    if not len(seg): print('section', s, 'starts past the end of the track', file=sys.stderr); continue
    for lo, hi in s.get('muffle', []):  # crossfade into a low-passed copy
        lp = lowpass(seg, s.get('cutoff', 700)) * 1.25
        t = at + np.arange(len(seg)) / SR
        k = np.clip(np.minimum((t - lo + 0.3) / 0.3, (hi + 0.3 - t) / 0.3), 0, 1)
        seg = seg * (1 - k) + lp * k
    ni = int(0.01 * SR); seg[:ni] *= ramp(ni)
    end = s.get('end', 'fade')
    if end == 'tape':
        n = int(0.7 * SR); rate = (1 - np.arange(n) / n) ** 1.6
        pos = s0 + len(seg) + np.cumsum(rate)
        seg = np.concatenate([seg, np.interp(pos, np.arange(len(src)), src) * ramp(n, False) ** 0.5])
    else:
        no = int((0.01 if end == 'cut' else s.get('fade', 0.25)) * SR); seg[-no:] *= ramp(no, False)
    i = int(at * SR); seg = seg[: N - i]; out[i:i + len(seg)] += seg

y = out / (np.abs(out).max() + 1e-9) * 0.9
with wave.open(out_path, 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((y * 32767).astype(np.int16).tobytes())
print('wrote', out_path)
