# TEMPLATE: music + synthesized SFX mix for one concrete 20 s storyboard.
# Copy it into your project and change the cue list at the bottom (and the scene
# beats in S / HIT* / CLICK) to match your own composition.
# usage: python3 audio.py <remotion-project-dir> [out.wav] [duration_s=20]
# Reads <project>/src/music.json = {"bpm", "b0", "file"} and <project>/public/<file>.
import json, os, subprocess, sys, wave
import numpy as np

if len(sys.argv) < 2:
    sys.exit(__doc__ or 'usage: audio.py <remotion-project-dir> [out.wav] [duration_s=20]')
HERE = os.path.abspath(sys.argv[1])
SR = 48000
DUR = float(sys.argv[3]) if len(sys.argv) > 3 else 20.0
N = int(DUR * SR)
M = json.load(open(f'{HERE}/src/music.json'))
BEAT = 60 / M['bpm']
b = lambda k: M['b0'] + BEAT * k
S = dict(build=b(8), refine=b(16), play=b(20), share=b(28), cta=b(32))
HIT1, HIT2, CLICK = b(22), b(26), b(30)
rng = np.random.default_rng(5)

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f"{HERE}/public/{M['file']}", '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
mus = np.frombuffer(raw, np.float32).reshape(-1, 2).T.copy()
music = np.zeros((2, N), np.float32)
music[:, :min(N, mus.shape[1])] = mus[:, :N]


def onepole(x, a):
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y


# slow-mo: low-pass + duck the music while the replay is slowed down
t = np.arange(N) / SR
lo = np.clip((t - (HIT1 - 0.05)) / 0.12, 0, 1) * np.clip(((b(24) + 0.1) - t) / 0.25, 0, 1)
cut = 18000 * (1 - lo) + 450 * lo
a = 1 - np.exp(-2 * np.pi * cut / SR)
seg = slice(int((HIT1 - 0.3) * SR), int((b(24) + 0.5) * SR))
for ch in range(2):
    music[ch, seg] = onepole(music[ch, seg].astype(np.float64), a[seg]).astype(np.float32)
music *= (1 - 0.35 * lo)[None]
nf = int(0.45 * SR)
music[:, N - nf:] *= np.linspace(1, 0, nf)[None] ** 1.5

sfx = np.zeros((2, N), np.float32)


def put(t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    sig = sig[:max(0, N - i)]
    sfx[0, i:i + len(sig)] += sig * gain * np.cos((pan + 1) * np.pi / 4)
    sfx[1, i:i + len(sig)] += sig * gain * np.sin((pan + 1) * np.pi / 4)


def ts(d):
    return np.arange(int(d * SR)) / SR


def pock(f=900, d=0.12):
    x = ts(d)
    body = np.sin(2 * np.pi * f * x * (1 + 0.4 * np.exp(-x / 0.004))) * np.exp(-x / 0.018)
    click = rng.standard_normal(len(x)) * np.exp(-x / 0.0015)
    low = np.sin(2 * np.pi * 180 * x) * np.exp(-x / 0.03)
    return (body * 0.6 + click * 0.5 + low * 0.5).astype(np.float32)


def racket(big=False):
    x = ts(0.6 if big else 0.3)
    crack = rng.standard_normal(len(x)) * np.exp(-x / (0.006 if big else 0.004))
    string = np.sin(2 * np.pi * 1250 * x) * np.exp(-x / 0.03) + np.sin(2 * np.pi * 620 * x) * np.exp(-x / 0.05)
    boom = np.sin(2 * np.pi * (48 + 90 * np.exp(-x / 0.05)) * x) * np.exp(-x / 0.3) if big else 0
    return (crack * 0.8 + string * 0.5 + boom * 1.1).astype(np.float32)


def whoosh(d=0.45, up=False):
    x = ts(d)
    n = rng.standard_normal(len(x))
    f = np.linspace(400, 7000, len(x)) if up else np.linspace(6500, 350, len(x))
    y = onepole(n, 1 - np.exp(-2 * np.pi * f / SR))
    return (y * np.sin(np.pi * x / d) ** 2 * 1.4).astype(np.float32)


def ding(f=1320):
    x = ts(0.5)
    return ((np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 1.5 * x)) * np.exp(-x / 0.12)).astype(np.float32)


def thump():
    x = ts(0.35)
    return (np.sin(2 * np.pi * (60 + 60 * np.exp(-x / 0.03)) * x) * np.exp(-x / 0.12)).astype(np.float32)


words = 7
for i in range(words):
    put(b(i + 1), pock(820 + 40 * i), 0.32, -0.3 + 0.1 * i)
put(b(7.5) - 0.02, racket(True), 0.42)
put(S['build'] - 0.18, whoosh(0.35, up=True), 0.30)
put(S['build'], thump(), 0.45)
put(S['refine'] - 0.2, whoosh(0.4), 0.28, 0.4)
put(S['refine'], pock(950), 0.22, 0.5)
put(S['play'] - 0.3, thump(), 0.5)
put(S['play'], whoosh(0.5, up=True), 0.22)
put(HIT1, racket(True), 0.55)
put(HIT2, racket(False), 0.38)
score_t = b(24) + (10.3 - (9.45 - (HIT2 - b(24)) * 1.2)) / 1.2
put(score_t, ding(), 0.2)
put(S['share'] - 0.2, whoosh(0.42), 0.3, -0.5)
put(CLICK, pock(1500, 0.06), 0.25)
put(S['cta'] - 0.3, whoosh(0.6, up=True), 0.18)
put(b(36), pock(760), 0.3, 0.3)
put(b(37), pock(820), 0.3, -0.2)
put(b(38), ding(1760), 0.18)
put(b(38), pock(1100, 0.08), 0.2)

mix = music * 0.9 + sfx
pk = np.abs(mix).max()
print('peak', round(float(pk), 2))
mix /= max(pk / 0.98, 1)
out = sys.argv[2] if len(sys.argv) > 2 else f'{HERE}/work/audio.wav'
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype(np.int16).tobytes())
print('wrote', out)
