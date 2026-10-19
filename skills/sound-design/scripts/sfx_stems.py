#!/usr/bin/env python3
"""Synthesise sound effects from a cue list into two stems: punctuation (fx) and beds (amb).
Only effects: never use this for music.

usage: sfx_stems.py cues.json out_prefix [--duration 40]
writes <out_prefix>_fx.wav and <out_prefix>_amb.wav (48 kHz mono, each peak-normalised;
set their level against the voice with mix.py, not here)

cues.json: a list of {"t": seconds, "sfx": name, ...options}
  punctuation (fx stem), short and soft-edged:
    tick   {"freq": 1800}            small mark, counter step, check
    click  {}                        switch, instrument dying, button
    pop    {"f0": 400, "f1": 800}    something appears (bubble, label, icon)
    ding   {"freq": 1047}            relief, success, end card
    chime  {"freq": [880, 660]}      two-tone alert (cockpit, notification)
    thud   {"freq": 55, "dur": 0.7}  something lands; 90 Hz and 0.35 s for a stamp
    whoosh {"dur": 0.45}             low, airy transition (no hiss)
  beds (amb stem), long:
    engine {"dur": 5, "stop": 3.4}   rumble with a quiet whine; spools down from "stop" (absolute s)
    wind   {"dur": 20, "swell": true} thin wind; swell = grows towards the end
    buzz   {"dur": 3, "freq": 85}     small motors far away
    scrape {"dur": 2.6}              something dragging, decaying
  every cue also takes "gain" (relative, default 1)

Noise is band-limited with a pink tilt and kept out of 2.5-5 kHz where speech intelligibility
lives, so beds do not hiss over the voice. Needs `pip install numpy`.
"""
import json, sys, wave

if len(sys.argv) < 3 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help') else 1)
import numpy as np

cues = json.load(open(sys.argv[1])); prefix = sys.argv[2]
dur = float(sys.argv[sys.argv.index('--duration') + 1]) if '--duration' in sys.argv else max(c['t'] + c.get('dur', 1.5) for c in cues) + 0.5
SR = 48000; N = int(dur * SR)
fx, amb = np.zeros(N), np.zeros(N)
rng = np.random.default_rng(7)

def tt(sec): return np.arange(int(sec * SR)) / SR
def put(buf, t0, x, g):
    i = int(t0 * SR)
    if i < 0: x, i = x[-i:], 0
    x = x[: max(0, N - i)]; buf[i:i + len(x)] += x * g
def env(n, a=0.01, r=0.1):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def band(sec, lo, hi, slope=2):
    n = max(2, int(sec * SR)); X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR) + 1
    X *= 1 / (1 + (lo / f) ** (2 * slope)) / (1 + (f / hi) ** (2 * slope)) / np.sqrt(f / 100)
    y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)

def tick(c):
    x = tt(0.04); return np.sin(2 * np.pi * c.get('freq', 1800) * x) * np.exp(-x * 140)
def click(c):
    x = tt(0.07); return np.sin(2 * np.pi * 160 * x) * np.exp(-x * 70) + band(0.07, 400, 1800) * np.exp(-x * 110) * 0.4
def pop(c):
    x = tt(0.08); f = np.linspace(c.get('f0', 400), c.get('f1', 800), len(x))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.08) * np.exp(-x * 30)
def ding(c):
    x = tt(1.4); f = c.get('freq', 1047)
    return (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * f * 2 * x)) * np.exp(-x * 3.5) * env(len(x), 0.004, 0.2)
def chime(c):
    out = np.zeros(int(1.2 * SR))
    for j, f in enumerate(c.get('freq', [880, 660])):
        z = tt(0.7); i = int(j * 0.2 * SR); seg = np.sin(2 * np.pi * f * z) * np.exp(-z * 6) * env(len(z), 0.005, 0.1)
        out[i:i + len(seg)] += seg[: len(out) - i]
    return out
def thud(c):
    d = c.get('dur', 0.7); x = tt(d); f = c.get('freq', 55)
    return (np.sin(2 * np.pi * f * x * (1 - 0.25 * x)) * np.exp(-x * 6) + band(d, 40, 300) * np.exp(-x * 10) * 0.4) * env(len(x), 0.004, 0.1)
def whoosh(c):
    x = band(c.get('dur', 0.45), 150, 1200); return x * np.sin(np.linspace(0, np.pi, len(x))) ** 3
def engine(c):
    d = c.get('dur', 5); x = tt(d); stop = c.get('stop', c['t'] + d) - c['t']
    whf = np.where(x < stop, 900.0, 900.0 * np.exp(-(x - stop) * 2.2))
    y = band(d, 50, 500) + np.sin(2 * np.pi * np.cumsum(whf) / SR) * 0.06
    return y * np.where(x < stop, 1.0, np.exp(-(x - stop) * 3.0)) * env(len(x), 0.3, 0.05)
def wind(c):
    d = c.get('dur', 10); y = band(d, 200, 900) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.15 * tt(d)))
    if c.get('swell'): y *= np.linspace(0.35, 1.0, len(y)) ** 1.5
    return y * env(len(y), 1.5, 0.15)
def buzz(c):
    d = c.get('dur', 3); y = tt(d); f = c.get('freq', 85)
    return sum(np.sin(2 * np.pi * (f + 7 * i) * y + 2 * np.sin(2 * np.pi * (5 + i) * y)) for i in range(3)) / 3 * env(len(y), 0.4, 0.5)
def scrape(c):
    d = c.get('dur', 2.6); x = tt(d)
    return band(d, 300, 1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 13 * x)) * np.exp(-x * 1.0) * env(len(x), 0.02, 0.4)

FX = {'tick': tick, 'click': click, 'pop': pop, 'ding': ding, 'chime': chime, 'thud': thud, 'whoosh': whoosh}
AMB = {'engine': engine, 'wind': wind, 'buzz': buzz, 'scrape': scrape}
for c in cues:
    name = c['sfx']
    if name in FX: put(fx, c['t'], FX[name](c), c.get('gain', 1.0))
    elif name in AMB: put(amb, c['t'], AMB[name](c), c.get('gain', 1.0))
    else: sys.exit(f'unknown sfx "{name}", use one of {sorted(FX) + sorted(AMB)}')

def write(path, y):
    y = y / (np.abs(y).max() + 1e-9) * 0.9
    with wave.open(path, 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((y * 32767).astype(np.int16).tobytes())
write(prefix + '_fx.wav', fx); write(prefix + '_amb.wav', amb)
print('wrote', prefix + '_fx.wav', prefix + '_amb.wav')
