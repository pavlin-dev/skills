#!/usr/bin/env python3
"""Placeholder voice + timeline.json for a script, with Microsoft Edge voices (edge-tts), so the film can be
built and timed before the real take exists. NOT a final voice: replace it with a real take (voice-over skill:
vo_align.py + vo_timeline.py write the same timeline.json format) and the scenes re-time themselves.

usage: tts_placeholder.py <lines.txt> [--voice en-US-AndrewNeural] [--rate +4%] [--extra id=seconds ...]
                          [--show "spoken words=caption text" ...] [--tail 1.6]
                          [--out-json timeline.json] [--out-wav vo.wav]

lines.txt: one voice line per row, "id: text", e.g.
    hook: This telescope had to unfold itself in space. One jam, and it was dead.
    mirror: Its mirror is six and a half meters wide. Too wide for any rocket.
The whole script is spoken in ONE run (consistent voice), word times come from edge-tts word boundaries.
--extra adds silence before a line (a pause before the punchline), --show maps how a number is spoken to how
the caption writes it (e.g. --show "110 degrees=110 °C"); the first word gets "show", the rest "show": "".

timeline.json: {"duration", "lines": [{"id", "text", "start", "end", "words": [{"w", "t0", "t1"[, "show"]}]}]}
Needs: pip install edge-tts; ffmpeg. Behind a TLS-inspecting proxy set SSL_CERT_FILE to its CA bundle.
Other voices: edge-tts --list-voices (Czech: cs-CZ-AntoninNeural, cs-CZ-VlastaNeural).
"""
import argparse, asyncio, json, os, re, ssl, subprocess, sys, tempfile, unicodedata

if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 else 1)
ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('script'); ap.add_argument('--voice', default='en-US-AndrewNeural'); ap.add_argument('--rate', default='+4%')
ap.add_argument('--extra', action='append', default=[]); ap.add_argument('--show', action='append', default=[])
ap.add_argument('--tail', type=float, default=1.6)
ap.add_argument('--out-json', default='timeline.json'); ap.add_argument('--out-wav', default='vo.wav')
a = ap.parse_args()
import edge_tts

cafile = os.environ.get('SSL_CERT_FILE') or os.environ.get('REQUESTS_CA_BUNDLE')
if cafile and hasattr(edge_tts, 'communicate'):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=cafile)

norm = lambda s: re.sub(r'[^\w]', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode()) or s.lower()
lines = []
for row in open(a.script, encoding='utf-8'):
    if not row.strip(): continue
    lid, _, text = row.partition(':')
    if not text.strip(): sys.exit(f'line without "id:" prefix: {row.strip()}')
    lines.append((lid.strip(), text.strip()))
tokens = [(i, tok) for i, (_, text) in enumerate(lines) for tok in text.split()]

async def speak(path):
    words = []
    c = edge_tts.Communicate(' '.join(t for _, t in lines), a.voice, rate=a.rate, boundary='WordBoundary')
    with open(path, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio': f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append((ch['text'], ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7))
    return words

tmp = tempfile.mkdtemp()
mp3 = os.path.join(tmp, 'take.mp3')
for attempt in range(4):
    try: bounds = asyncio.run(speak(mp3)); break
    except Exception as e:
        print('edge-tts failed, retrying:', e, file=sys.stderr)
else: sys.exit('edge-tts failed 4 times')

# map boundaries (may merge tokens, e.g. "110 degrees") onto script tokens; split a merged span's time evenly
timed, ti = [], 0
for text, s, e in bounds:
    want, span = norm(text), []
    while ti < len(tokens) and (not span or norm(''.join(t for _, t in span)) != want) and len(norm(''.join(t for _, t in span))) < len(want):
        span.append(tokens[ti]); ti += 1
    if not span: continue
    for j, tok in enumerate(span): timed.append((tok, s + (e - s) * j / len(span), s + (e - s) * (j + 1) / len(span)))
if ti < len(tokens): print(f'warning: {len(tokens) - ti} script words got no time (check the last lines)', file=sys.stderr)

extra = {k: float(v) for k, v in (x.split('=', 1) for x in a.extra)}
out, cuts, shiftt = [], [], 0.0
for li, (lid, text) in enumerate(lines):
    ws = [(tok, s, e) for (i, tok), s, e in timed if i == li]
    if not ws: continue
    if lid in extra and out:
        prev_end = out[-1]['words'][-1]['t1'] - shiftt
        cuts.append(((prev_end + ws[0][1]) / 2, extra[lid])); shiftt += extra[lid]
    words = [{'w': tok, 't0': round(s + shiftt, 3), 't1': round(e + shiftt, 3)} for tok, s, e in ws]
    for spoken, shown in sorted(((k.split(), v) for k, v in (x.split('=', 1) for x in a.show)), key=lambda kv: -len(kv[0])):
        n = len(spoken)
        for i in range(len(words) - n + 1):
            if [norm(w['w']) for w in words[i:i + n]] == [norm(x) for x in spoken] and not any('show' in w for w in words[i:i + n]):
                punct = re.search(r'[.,:;?!…]*$', words[i + n - 1]['w']).group()  # keep the sentence break for captions
                words[i]['show'] = shown + punct
                for w in words[i + 1:i + n]: w['show'] = ''
    out.append({'id': lid, 'text': text, 'start': round(words[0]['t0'] - 0.05, 3), 'end': words[-1]['t1'], 'words': words})

# audio: cut the take at the pauses, insert silence, pad the tail
filt, parts, edges = [], [], [0.0] + [c for c, _ in cuts]
for i, s in enumerate(edges):
    e = edges[i + 1] if i + 1 < len(edges) else None
    filt.append(f"[0:a]atrim=start={s}" + (f":end={e}" if e else '') + f",asetpts=PTS-STARTPTS[s{i}]"); parts.append(f'[s{i}]')
    if i < len(cuts): filt.append(f"aevalsrc=0:d={cuts[i][1]}:s=24000[z{i}]"); parts.append(f'[z{i}]')
filt.append(''.join(parts) + f"concat=n={len(parts)}:v=0:a=1,apad=pad_dur={a.tail},aresample=48000[out]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-filter_complex', ';'.join(filt), '-map', '[out]', '-ac', '1', a.out_wav], check=True)
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.out_wav]))
json.dump({'duration': round(dur, 3), 'lines': out}, open(a.out_json, 'w'), ensure_ascii=False, indent=1)
for l in out: print(f"{l['id']:>10} {l['start']:6.2f}-{l['end']:6.2f}  {' '.join(w.get('show', w['w']) for w in l['words'])}")
print(f'duration {dur:.2f} s  ->  {a.out_wav}, {a.out_json}   (PLACEHOLDER voice: {a.voice})')
