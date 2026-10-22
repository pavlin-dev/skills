#!/usr/bin/env python3
"""Sound-effect cue list tied to words of the voice-over, for the sound-design skill's sfx_stems.py.

usage: word_cues.py timeline.json spec.json out_cues.json
spec.json: a list of entries
  {"at": "p1:laggy", "offset": -0.2, "sfx": "whoosh", "dur": 0.3, "gain": 0.5}   one effect at a word (+offset s)
  {"typing": "two large pizzas", "from": "l2:just", "to": "l2:it", "to_offset": 0.6, "gain": 0.25}
        one soft tick per letter, spread exactly like toon.js typed() spreads them, plus a pop when it is sent
  {"bed": "wind", "from": "h1:since", "to": "h2:his", "gain": 0.8}      an ambience bed between two words
Words are "<line id>:<word>" (lower case, punctuation stripped, first occurrence in the line), as T() in toon.js.
Every other key of an entry (freq, f0, f1, dur, ...) is passed to sfx_stems.py as is.
"""
import json, re, sys

if len(sys.argv) < 4 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help') else 1)
TL = json.load(open(sys.argv[1], encoding='utf8')); spec = json.load(open(sys.argv[2], encoding='utf8'))
W = {}
for l in TL['lines']:
    for w in l['words']: W.setdefault(l['id'] + ':' + re.sub(r'[^\w]', '', w['w'].lower()), w['t0'])
def T(k):
    if k not in W: sys.exit(f'no word {k!r}; words look like {next(iter(W))!r}')
    return W[k]
cues = []
for e in spec:
    e = dict(e)
    if 'typing' in e:
        s, t0, t1 = e.pop('typing'), T(e.pop('from')) + e.pop('from_offset', 0), T(e.pop('to')) + e.pop('to_offset', 0); g = e.pop('gain', 0.25)
        for i, ch in enumerate(s):
            if ch != ' ': cues.append({'t': round(t0 + i * (t1 - t0) / len(s), 3), 'sfx': 'tick', 'freq': 1500 + (i % 4) * 90, 'gain': g})
        cues.append({'t': round(t1 + 0.15, 3), 'sfx': 'pop', 'f0': 500, 'f1': 900, 'gain': 2 * g})
    elif 'bed' in e:
        t0, t1 = T(e.pop('from')), T(e.pop('to')); cues.append({'t': round(t0, 3), 'sfx': e.pop('bed'), 'dur': round(t1 - t0, 3), **e})
    else:
        t = T(e.pop('at')) + e.pop('offset', 0); cues.append({'t': round(max(0, t), 3), **e})
cues.sort(key=lambda c: c['t'])
json.dump(cues, open(sys.argv[3], 'w'), indent=0)
print(len(cues), 'cues ->', sys.argv[3])
