#!/usr/bin/env python3
"""Add pauses to a voice take without cutting into any word (timing for jokes and turns).

usage: pauses.py take.wav take.json out_prefix lead tail "<line_id>:<word index|start>=seconds" ...
  lead / tail   silence added before the first and after the last word (s)
  "p2:start=0.4"  0.4 s more before line p2;  "d1:10=0.8"  0.8 s more before word 10 (0-based) of line d1
The silence goes in at the quietest 10 ms inside the existing gap before that word, and every later word time
moves with it. Writes out_prefix.wav and out_prefix.json (same timeline format). Check the printed splice points:
each should sit in silence. Needs ffmpeg, `pip install numpy`.
"""
import sys
if len(sys.argv) < 6 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help') else 1)
import json, sys, subprocess, numpy as np
wav, js, out, lead, tail = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5])
SR = 48000
x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']), np.float32).copy()
TL = json.load(open(js)); flat = [(l, i) for l in TL['lines'] for i in range(len(l['words']))]
ins = []
for a in sys.argv[6:]:
    k, sec = a.split('='); lid, wi = k.split(':')
    j = next(n for n, (l, i) in enumerate(flat) if l['id'] == lid and (i == 0 if wi == 'start' else i == int(wi)))
    l1, i1 = flat[j - 1]; l2, i2 = flat[j]
    g0, g1 = l1['words'][i1]['t1'], l2['words'][i2]['t0']
    a0, a1 = int(g0 * SR), max(int(g0 * SR) + 1, int(g1 * SR)); fr = 480
    best = min(range(a0, max(a0 + 1, a1 - fr), fr // 2), key=lambda s: float(np.sqrt(np.mean(x[s:s + fr] ** 2))))
    ins.append((best + fr // 2, float(sec), g1))
ins.sort()
parts, last, shift = [], 0, []
for p, sec, _ in ins: parts += [x[last:p], np.zeros(int(sec * SR), np.float32)]; last = p
parts.append(x[last:]); y = np.concatenate([np.zeros(int(lead * SR), np.float32)] + parts + [np.zeros(int(tail * SR), np.float32)])
def moved(t): return t + lead + sum(sec for p, sec, _ in ins if p / SR <= t)
for l in TL['lines']:
    for w in l['words']: w['t0'] = round(moved(w['t0']), 3); w['t1'] = round(moved(w['t1']), 3)
    l['start'], l['end'] = l['words'][0]['t0'], l['words'][-1]['t1']
TL['duration'] = round(len(y) / SR, 3)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', out + '.wav'], input=y.tobytes(), check=True)
json.dump(TL, open(out + '.json', 'w'), ensure_ascii=False, indent=1)
pk = float(np.abs(x).max()) or 1.0
for p, _, _ in ins: w = x[max(0, p - 240):p + 240]; print(f'splice at {p / SR:.2f} s: {20 * np.log10(float(np.sqrt(np.mean(w ** 2))) / pk + 1e-9):.0f} dB below peak')
print('duration', TL['duration'])
