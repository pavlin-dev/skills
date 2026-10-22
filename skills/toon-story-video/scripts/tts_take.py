#!/usr/bin/env python3
"""One continuous TTS take of the whole script, with word times from the TTS engine (a placeholder voice).

usage: tts_take.py script.txt out_prefix [voice] [rate]
  script.txt   one line per VO line: "id|text"
  voice        an edge-tts voice (default en-US-AndrewNeural; Czech: cs-CZ-AntoninNeural), list: edge-tts --list-voices
  rate         e.g. "+4%"
writes out_prefix.mp3, out_prefix.wav (48 kHz mono) and out_prefix.json (timeline: {"duration", "lines": [{id, text,
start, end, words: [{w, t0, t1}]}]}), the format toon.js reads.

The whole script is generated in ONE request, so the voice flows like one performance; never cut it into lines and
re-time them (that made the voice "trhá se" on review). Add pauses with pauses.py, which only stretches silences.

edge-tts uses Microsoft's read-aloud service through an unofficial endpoint: fine for drafts, not cleared for a
published ad. For the final video use a real voice, the voice-over skill (Gemini TTS) or an official TTS API.
Needs: ffmpeg, `pip install edge-tts`. Behind a TLS-inspecting proxy set SSL_CA_BUNDLE to its CA file.
"""
import sys
if len(sys.argv) < 3 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help') else 1)
import asyncio, ssl, json, sys, os, random, re, subprocess, edge_tts, edge_tts.communicate as c
ca = os.environ.get('SSL_CA_BUNDLE') or os.environ.get('REQUESTS_CA_BUNDLE')
if ca: c._SSL_CTX = ssl.create_default_context(cafile=ca)
src, out = sys.argv[1], sys.argv[2]; voice = sys.argv[3] if len(sys.argv) > 3 else 'en-US-AndrewNeural'; rate = sys.argv[4] if len(sys.argv) > 4 else '+0%'
lines = [l.split('|', 1) for l in open(src, encoding='utf8').read().strip().split('\n')]
text = ' '.join(t for _, t in lines)
async def take():
    for attempt in range(40):
        try:
            com = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary'); words, audio = [], b''
            async for ch in com.stream():
                if ch['type'] == 'audio': audio += ch['data']
                elif ch['type'] == 'WordBoundary': words.append({'w': ch['text'], 't0': ch['offset'] / 1e7, 't1': (ch['offset'] + ch['duration']) / 1e7})
            return audio, words
        except Exception as e:
            print('retry', attempt, e, flush=True); await asyncio.sleep(1 + random.random() * 3)
    return None, None
audio, words = asyncio.run(take())
if audio is None: sys.exit('TTS failed 40 times')
open(out + '.mp3', 'wb').write(audio)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', out + '.mp3', '-ar', '48000', '-ac', '1', out + '.wav'], check=True)
# assign engine words to script words. The engine can merge words ("since 1987") or read numbers as several
# words, so split merged boundaries (time shared by length) and align the token streams with difflib.
import difflib
norm = lambda s: re.sub(r'[^\w]', '', s.lower())
eng = []
for e in words:
    parts = [p for p in e['w'].split() if norm(p)]
    tot = sum(len(p) for p in parts) or 1; t = e['t0']
    for p in parts:
        d = (e['t1'] - e['t0']) * len(p) / tot; eng.append({'w': p, 't0': t, 't1': t + d}); t += d
scr = [(lid, w) for lid, t in lines for w in t.split() if norm(w)]
sm = difflib.SequenceMatcher(a=[norm(w) for _, w in scr], b=[norm(e['w']) for e in eng], autojunk=False)
times = [None] * len(scr)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal':
        for k in range(i2 - i1): times[i1 + k] = (eng[j1 + k]['t0'], eng[j1 + k]['t1'])
    elif j2 > j1:  # replaced span: spread the engine time over the script words
        t0, t1 = eng[j1]['t0'], eng[j2 - 1]['t1']
        for k in range(i2 - i1): times[i1 + k] = (t0 + (t1 - t0) * k / (i2 - i1), t0 + (t1 - t0) * (k + 1) / (i2 - i1))
for i in range(len(times)):  # words the engine never reported: take the previous end
    if times[i] is None: times[i] = (times[i - 1][1], times[i - 1][1]) if i else (0, 0)
res, k = [], 0
for lid, t in lines:
    lw = []
    for w in [w for w in t.split() if norm(w)]:
        lw.append({'w': w, 't0': round(times[k][0], 3), 't1': round(times[k][1], 3)}); k += 1
    res.append({'id': lid, 'text': t, 'start': lw[0]['t0'], 'end': lw[-1]['t1'], 'words': lw})
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out + '.wav']))
json.dump({'duration': round(dur, 3), 'lines': res}, open(out + '.json', 'w'), ensure_ascii=False, indent=1)
for l in res: print(l['id'], l['start'], l['end'], l['text'])
