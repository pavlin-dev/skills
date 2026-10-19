#!/usr/bin/env python3
"""Lay the lines cut by vo_align.py out on the video's timeline and render the voice track.

usage: vo_timeline.py <vo_dir> [--lead 0.3] [--tail 1.0] [--min-gap 0.25] [--extra id=seconds ...]
                      [--out-json timeline.json] [--out-wav vo.wav]

<vo_dir> is the out_dir of vo_align.py (align.json and one <id>.wav per line). Lines keep the
gap the voice performed (at least --min-gap); --extra adds silence before a line, e.g.
--extra landing=0.9 for a pause before a punchline that the take ran into.

timeline.json: {"duration": s, "lines": [{"id", "text", "start", "end",
                "words": [{"w", "t0", "t1"}]}]} with absolute times on the video timeline.
Words whisper missed (t = null in align.json) get interpolated times; a word ends where the
next one starts. Drive captions and scene cuts from these numbers.

Needs: ffmpeg.
"""
import json, os, subprocess, sys

if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 else 1)
import argparse
ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('vo_dir'); ap.add_argument('--lead', type=float, default=0.3); ap.add_argument('--tail', type=float, default=1.0)
ap.add_argument('--min-gap', type=float, default=0.25); ap.add_argument('--extra', action='append', default=[])
ap.add_argument('--out-json', default='timeline.json'); ap.add_argument('--out-wav', default='vo.wav')
a = ap.parse_args()
extra = {k: float(v) for k, v in (e.split('=', 1) for e in a.extra)}
A = json.load(open(os.path.join(a.vo_dir, 'align.json')))

def word_times(l, t0):
    ws = l['words']; ts = [w['t'] for w in ws]; n = len(ws)
    for i in range(n):
        if ts[i] is None:
            prev = next((ts[j] for j in range(i - 1, -1, -1) if ts[j] is not None), 0.0)
            nxt = next((ts[j] for j in range(i + 1, n) if ts[j] is not None), l['dur'])
            ts[i] = (prev + nxt) / 2
    return [{'w': w['word'], 't0': round(t0 + ts[i], 3),
             't1': round(t0 + (ts[i + 1] if i + 1 < n else l['dur'] - 0.05), 3)} for i, w in enumerate(ws)]

t, lines, parts, prev_end = a.lead, [], [], None
for l in A:
    if prev_end is not None:
        t += max(a.min_gap, l['start'] - prev_end) + extra.get(l['id'], 0)
    words = word_times(l, t)
    lines.append({'id': l['id'], 'text': ' '.join(w['w'] for w in words), 'start': round(t, 3),
                  'end': round(t + l['dur'], 3), 'words': words})
    parts.append((os.path.join(a.vo_dir, l['id'] + '.wav'), t))
    prev_end, t = l['end'], t + l['dur']
total = round(t + a.tail, 3)
json.dump({'duration': total, 'lines': lines}, open(a.out_json, 'w'), ensure_ascii=False, indent=1)

inputs, filt = [], []
for k, (p, st) in enumerate(parts):
    inputs += ['-i', p]; filt.append(f'[{k}]aresample=48000,adelay={int(st * 1000)}:all=1[a{k}]')
filt.append(''.join(f'[a{k}]' for k in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad=whole_dur={total}[out]')
subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[out]', '-ac', '1', a.out_wav], check=True)
for l in lines: print(f"{l['id']:>10} {l['start']:6.2f}-{l['end']:6.2f}  {l['text']}")
print(f'total {total} s -> {a.out_json}, {a.out_wav}')
