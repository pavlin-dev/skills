"""Mix a music excerpt with synthesized sound effects placed on beats, then loudnorm the result.

usage: python3 sfx_mix.py MUSIC CUES.json OUT.wav [--bpm 128] [--b0 0] [--start 0] [--dur 17.5]
                          [--music-gain 0.45] [--lufs -14]

MUSIC       any audio file ffmpeg can read (an excerpt or the whole track; --start skips into it)
CUES.json   list of effects, each placed by beat (relative to --b0) or by time in seconds:
              [{"beat": 2, "sfx": "tick", "gain": 0.5, "freq": 1600},
               {"beat": 6, "sfx": "whoosh", "dur": 0.6},
               {"time": 7.1, "sfx": "thud"},
               {"beat": 30.5, "sfx": "ding", "freq": 1320}]
            sfx: tick (reel click, word flip), thud (something lands), whoosh (morph, fly), ding (CTA, sparkle)
--music-gain  scale the music before adding effects; loud masters clip when summed (0.4-0.6 is usual)

Needs numpy and ffmpeg. Prints the peak and loudness of the result.
"""
import argparse, json, os, subprocess, sys, tempfile, wave

if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
    print(__doc__)
    sys.exit(0 if len(sys.argv) > 1 else 1)
import numpy as np

ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('music'); ap.add_argument('cues'); ap.add_argument('out')
ap.add_argument('--bpm', type=float, default=120)
ap.add_argument('--b0', type=float, default=0.0, help='time of beat 0 in the output, seconds')
ap.add_argument('--start', type=float, default=0.0, help='seconds to skip in MUSIC')
ap.add_argument('--dur', type=float, default=20.0)
ap.add_argument('--music-gain', type=float, default=0.45)
ap.add_argument('--lufs', type=float, default=-14.0)
a = ap.parse_args()

SR = 48000
N = int(a.dur * SR)
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(a.start), '-i', a.music, '-t', str(a.dur),
                      '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
mus = np.frombuffer(raw, np.float32).copy()
mus = np.pad(mus, (0, max(0, N - len(mus))))[:N]
idx = np.arange(N)
mus *= np.minimum(1, np.minimum(idx / (0.05 * SR), (N - idx) / (0.8 * SR)))   # tiny fade in, 0.8 s fade out
out = mus * a.music_gain
rng = np.random.default_rng(1)


def tick(freq=1800, dur=0.06):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * freq * t) * 0.6 + rng.standard_normal(len(t)) * 0.25) * np.exp(-t * 70)


def thud(freq=140, dur=0.2):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * (freq - 300 * t) * t) * np.exp(-t * 22)


def whoosh(freq=0, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    body = np.convolve(x, np.ones(40) / 40, 'same')
    return (x * 0.3 + body * 1.2) * np.sin(np.pi * t / dur) ** 2 * np.linspace(0.3, 1, n)


def ding(freq=1320, dur=0.7):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.01 * t)) * np.exp(-t * 6)


SFX = {'tick': tick, 'thud': thud, 'whoosh': whoosh, 'ding': ding}
for c in json.load(open(a.cues)):
    t = c['time'] if 'time' in c else a.b0 + c['beat'] * 60 / a.bpm
    kw = {k: c[k] for k in ('freq', 'dur') if k in c}
    x = SFX[c['sfx']](**kw) * c.get('gain', 0.4)
    i = int(t * SR)
    if 0 <= i < N:
        x = x[:N - i]; out[i:i + len(x)] += x

tmp = os.path.join(tempfile.mkdtemp(), 'mix.wav')
w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'loudnorm=I={a.lufs}:TP=-1.5,aresample={SR}', a.out], check=True)
stats = subprocess.run(['ffmpeg', '-i', a.out, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
print(a.out, ' '.join(l.split('] ')[-1] for l in stats.splitlines() if 'mean_volume' in l or 'max_volume' in l))
if np.abs(out).max() >= 1:
    print('warning: the raw mix clipped before loudnorm; lower --music-gain', file=sys.stderr)
