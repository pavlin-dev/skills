#!/usr/bin/env python3
"""Lay the lines cut by vo_align.py out on the video's timeline and render the voice track.

usage: vo_timeline.py <vo_dir> [--lead 0.3] [--tail 1.0] [--min-gap 0] [--max-gap 0]
                      [--extra id=seconds ...] [--show "spoken words=caption text" ...]
                      [--out-json timeline.json] [--out-wav vo.wav]

<vo_dir> is the out_dir of vo_align.py (align.json and take.wav). The voice track is the take
itself, played in one piece: breaths, room tone and the tail of every word stay as performed,
and nothing is cut where a gap is not changed. By default every gap stays exactly as performed.
Change gaps only when needed, and only inside the pauses between lines (never inside a line):
--extra adds silence before a line (e.g. --extra landing=0.9 before a punchline the take ran
into), --max-gap shortens long pauses, --min-gap lengthens short ones. Each change is spliced
with a 40 ms crossfade in the middle of the pause and printed, so you know where to listen.
Fit the picture to these times; never fit the voice to the picture.

Directories from an older vo_align.py without take.wav fall back to joining the per-line files
(with silence between them, which sounds choppier); re-run vo_align.py to get take.wav.

--show maps how the narrator says something to how the caption writes it, e.g.
--show "tisíc devět set osmdesát tři,=1983," : the first of those words gets "show": "1983,"
and the rest "show": "" (hidden). Captions should print word.get("show", word["w"]).

timeline.json: {"duration": s, "lines": [{"id", "text", "start", "end",
                "words": [{"w", "t0", "t1"[, "show"]}]}]} with absolute times on the video timeline.
Words whisper missed (t = null in align.json) get interpolated times; a word ends where the
next one starts. Drive captions and scene cuts from these numbers.

Needs: ffmpeg, numpy.
"""
import json, os, subprocess, sys

if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 else 1)
import argparse
ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('vo_dir'); ap.add_argument('--lead', type=float, default=0.3); ap.add_argument('--tail', type=float, default=1.0)
ap.add_argument('--min-gap', type=float, default=None); ap.add_argument('--max-gap', type=float, default=0)
ap.add_argument('--extra', action='append', default=[]); ap.add_argument('--show', action='append', default=[])
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

import re, unicodedata
def norm(w):
    w = unicodedata.normalize('NFKD', w.lower()); w = ''.join(c for c in w if not unicodedata.combining(c))
    return re.sub(r'[^\w]', '', w)
# longest phrases first, and a word mapped once is not mapped again ("osm serverů." before "osm.")
SHOW = sorted(((k.split(), v) for k, v in (e.split('=', 1) for e in a.show)), key=lambda kv: -len(kv[0]))
def apply_show(words):
    for spoken, shown in SHOW:
        n = len(spoken)
        for i in range(len(words) - n + 1):
            if any('show' in w for w in words[i:i + n]): continue
            if [norm(w['w']) for w in words[i:i + n]] == [norm(x) for x in spoken]:
                words[i]['show'] = shown
                for w in words[i + 1:i + n]: w['show'] = ''

take = os.path.join(a.vo_dir, 'take.wav')
continuous = os.path.exists(take)
min_gap = a.min_gap if a.min_gap is not None else (0.0 if continuous else 0.1)

t, lines, parts, edits, prev_end = a.lead, [], [], [], None
for l in A:
    if prev_end is not None:
        performed = l['start'] - prev_end  # may be slightly negative when lines run together
        gap = max(min_gap, performed) if min_gap > 0 else performed
        if a.max_gap > 0: gap = min(gap, a.max_gap)
        gap += extra.get(l['id'], 0)
        if abs(gap - performed) > 0.005:
            edits.append((l['id'], (prev_end + l['start']) / 2, gap - performed))
        t += gap
    words = word_times(l, t)
    apply_show(words)
    lines.append({'id': l['id'], 'text': ' '.join(w['w'] for w in words), 'start': round(t, 3),
                  'end': round(t + l['dur'], 3), 'words': words})
    parts.append((os.path.join(a.vo_dir, l['id'] + '.wav'), t))
    prev_end, t = l['end'], t + l['dur']
total = round(t + a.tail, 3)
json.dump({'duration': total, 'lines': lines}, open(a.out_json, 'w'), ensure_ascii=False, indent=1)

if continuous:
    import numpy as np
    SR, X = 48000, 0.02  # splice crossfade: X before and after the cut point
    x = np.frombuffer(subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', take, '-f', 'f32le',
                                               '-ac', '1', '-ar', str(SR), '-']), np.float32)
    # runs of untouched take: (take_from, take_to, timeline_pos); a cut sits in a pause between lines
    runs, src, pos = [], max(0.0, A[0]['start'] - a.lead), a.lead - (A[0]['start'] - max(0.0, A[0]['start'] - a.lead))
    for _, cut, delta in edits:
        runs.append((src, cut - max(0.0, -delta) / 2, pos))
        pos += cut - max(0.0, -delta) / 2 - src + max(0.0, delta)
        src = cut + max(0.0, -delta) / 2
    runs.append((src, A[-1]['end'] + a.tail, pos))
    out = np.zeros(int(total * SR) + 1, np.float32)
    for k, (s0, s1, p0) in enumerate(runs):
        fi, fo = (X if k > 0 else 0), (X if k < len(runs) - 1 else 0)
        i0, i1 = int(round((s0 - fi) * SR)), min(len(x), int(round((s1 + fo) * SR)))
        o0 = int(round((p0 - fi) * SR))
        if i0 < 0: o0 -= i0; i0 = 0
        seg = x[i0:i1].copy()
        if o0 < 0: seg = seg[-o0:]; o0 = 0
        seg = seg[:len(out) - o0]
        env = np.ones(len(seg), np.float32)
        n = int(2 * fi * SR)
        if n: env[:n] = np.sin(np.linspace(0, np.pi / 2, n)) ** 2
        n = min(int(2 * fo * SR), len(seg))
        if n: env[len(seg) - n:] = np.cos(np.linspace(0, np.pi / 2, n)) ** 2
        n = int(0.01 * SR)  # tiny fade at the very ends of the track only
        if k == 0: env[:n] *= np.linspace(0, 1, n)
        if k == len(runs) - 1 and len(seg) >= n: env[-n:] *= np.linspace(1, 0, n)
        out[o0:o0 + len(seg)] += seg * env
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    a.out_wav], input=out.tobytes(), check=True)
else:
    print('no take.wav in', a.vo_dir, '- joining per-line files; re-run vo_align.py for a continuous voice', file=sys.stderr)
    inputs, filt = [], []
    for k, (p, st) in enumerate(parts):
        inputs += ['-i', p]; filt.append(f'[{k}]aresample=48000,adelay={int(st * 1000)}:all=1[a{k}]')
    filt.append(''.join(f'[a{k}]' for k in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad=whole_dur={total}[out]')
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[out]', '-ac', '1', a.out_wav], check=True)
for l in lines: print(f"{l['id']:>10} {l['start']:6.2f}-{l['end']:6.2f}  {l['text']}")
for lid, _, delta in edits:
    print(f"   splice before {lid}: pause {'+' if delta > 0 else ''}{delta:.2f} s  (listen here)")
print(f'total {total} s -> {a.out_json}, {a.out_wav}' + ('' if continuous else ' (per-line fallback)'))
