"""Sound design for a scenario: music + procedural SFX + a few real CC0 recordings,
placed on the exact animation events exported by `build.py ... events`.

usage: python3 audio_mix.py SCENARIO.json EVENTS_DIR OUT.wav
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
from scipy import signal

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "assets", "sfx")
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ io
def load(path, start=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start)]
    if dur:
        cmd += ["-t", str(dur)]
    cmd += ["-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def env(n, a=0.005, d=None, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    if d:
        e *= np.exp(-curve * np.maximum(0, t - a) / d)
    return e


def band(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def lowp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


# ------------------------------------------------------------------ procedural SFX
def creak(dur=0.32, f0=760, f1=1150, rough=38, bright=1.0):
    """Swing-chain squeak: inharmonic metallic partials with a pitch glide and stick-slip roughness."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    f *= 1 + 0.02 * np.sin(2 * np.pi * 9 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.55 * np.sin(2.01 * ph) + 0.3 * bright * np.sin(3.07 * ph) + 0.15 * bright * np.sin(4.2 * ph)
    stick = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * rough * t + 3 * np.sin(2 * np.pi * 3 * t)))
    x *= lowp(stick, 400)
    x += 0.08 * band(rng.standard_normal(n), 1500, 6000)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return norm(x * e, 0.8)


def whoosh(dur=0.5, lo=300, hi=2400, peak=0.5):
    """Air swish: noise through a band-pass whose centre sweeps up then down."""
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 512
    zi = None
    for i in range(0, n, blk):
        u = (i + blk / 2) / n
        fc = lo + (hi - lo) * math.sin(math.pi * min(1, u / max(1e-3, peak * 2)) ** 1.0) if u < peak else \
            lo + (hi - lo) * max(0.0, 1 - (u - peak) / (1 - peak)) ** 1.5
        fc = max(lo, fc)
        b, a = signal.butter(2, [fc * 0.6 / (SR / 2), min(fc * 1.6, SR / 2 - 200) / (SR / 2)], "band")
        if zi is None or len(zi) != max(len(a), len(b)) - 1:
            zi = signal.lfilter_zi(b, a) * 0
        out[i:i + blk], zi = signal.lfilter(b, a, noise[i:i + blk], zi=zi)
    t = np.arange(n) / n
    e = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)
    return norm(out * e, 0.9)


def thump(f0=95, f1=48, dur=0.35, click=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 18)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    nb = lowp(rng.standard_normal(n), 1800) * np.exp(-t * 60) * click
    return norm(x + nb, 0.95)


def slide_whistle(f0, f1, dur, vib=6.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    f = f0 * (f1 / f0) ** (u ** 0.85)
    f *= 1 + 0.018 * np.sin(2 * np.pi * vib * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.04 * np.sin(3 * ph)
    breath = band(rng.standard_normal(n), 1500, 7000) * 0.05
    e = np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.08)
    return norm((x + breath) * e, 0.7)


def clank(dur=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t + p) * np.exp(-t * d)
            for f, a, d, p in ((523, 1.0, 6, 0), (1317, 0.6, 9, 1), (2190, 0.45, 12, 2), (3460, 0.3, 16, 0.5)))
    x += 0.3 * band(rng.standard_normal(n), 2000, 8000) * np.exp(-t * 40)
    return norm(x, 0.8)


def sting(dur=1.1):
    """Low dramatic 'dun' for the tension close-up."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((55, 1.0), (110, 0.6), (165, 0.25), (82.4, 0.5)))
    x *= np.exp(-t * 2.6) * np.minimum(1, t / 0.01)
    x += 0.4 * lowp(rng.standard_normal(n), 300) * np.exp(-t * 14)
    return norm(x, 0.9)


def pop(dur=0.09):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 900 * np.exp(-t * 30) + 180
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45), 0.8)


# ------------------------------------------------------------------ real recordings
def real_thud():
    x = load(os.path.join(SRC, "thud.wav"), 0.0, 0.7)
    x *= env(len(x), 0.002, 0.45, 3)
    return norm(x, 0.95)


def real_steps():
    out = []
    for s in (0.10, 1.54, 2.80, 4.16):
        x = load(os.path.join(SRC, "footsteps.wav"), s, 0.28)
        out.append(norm(x * env(len(x), 0.002, 0.2, 3), 0.8))
    return out


# ------------------------------------------------------------------ mixer
class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, x, t, gain_db=0.0, pan=0.0):
        i = int(t * SR)
        if i >= self.n:
            return
        x = x[: self.n - i] * (10 ** (gain_db / 20))
        gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        self.L[i:i + len(x)] += x * gl * 1.414
        self.R[i:i + len(x)] += x * gr * 1.414


def main():
    if len(sys.argv) < 4 or sys.argv[1] in ("-h", "--help"):
        print(__doc__.strip())
        print("  EVENTS_DIR holds events_<shot>.json written by `build.py SCEN SHOT events --out EVENTS_DIR`")
        sys.exit(0 if len(sys.argv) > 1 else 1)
    scen, ev_dir, out = sys.argv[1:4]
    sc = json.load(open(scen))
    total = sum(s["duration"] for s in sc["shots"])
    m = Mix(total)
    offs, o = {}, 0.0
    for s in sc["shots"]:
        offs[s["id"]] = o
        o += s["duration"]
    ev = {s["id"]: json.load(open(os.path.join(ev_dir, f"events_{s['id']}.json"))) for s in sc["shots"]}

    # ---- ambience: real schoolyard with kids, low under everything
    amb = load(os.path.join(SRC, "ambience_schoolyard.ogg"), 0.0, total + 0.5)
    amb = band(amb, 150, 9000)
    amb *= np.minimum(1, np.arange(len(amb)) / (0.4 * SR))
    m.add(norm(amb, 0.5), 0.0, -13)

    # ---- music (real ukulele): cut on the launch, back on the landing
    mu = sc.get("music")
    if mu:
        x = load(os.path.join(HERE, mu["file"]), 0, total + 0.5)
        # level the loop: slow automatic gain so the quiet intro is as present as the rest
        win = int(0.5 * SR)
        rms = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode="same")) + 1e-4
        gain = np.clip((np.median(rms) * 1.6 / rms) ** 0.8, 0.6, 5.0)
        gain = lowp(gain, 3)
        x = norm(x * gain, 0.9)
        t = np.arange(len(x)) / SR
        g = np.ones_like(x)
        m0, m1 = mu.get("mute_from", 1e9), mu.get("resume_at", 1e9)
        g[(t >= m0) & (t < m1)] = 0
        fade = (t >= m0 - 0.08) & (t < m0)
        g[fade] = (m0 - t[fade]) / 0.08
        g *= np.clip((total - t) / 0.5, 0, 1)
        # duck under the tension close-up
        m.add(x * g, 0.0, -4)

    steps = real_steps()

    for sid, e in ev.items():
        off = offs[sid]
        # swing creaks at every turning point, louder for bigger swings
        for i, (t, ang) in enumerate(e["extremes"]):
            big = min(1.0, abs(ang) / 90)
            c = creak(0.28 + 0.15 * big, 700 + 200 * (i % 2), 1100 + 500 * big, bright=0.8 + big)
            m.add(c, off + t - 0.12, -15 + 9 * big, pan=-0.2)
            if abs(ang) > 60:
                m.add(clank(), off + t - 0.02, -8, pan=-0.2)
        # air past the bottom of each swing
        for t, speed in e["bottom_pass"]:
            k = min(1.0, speed / 180)
            m.add(whoosh(0.35 + 0.25 * k, 250, 1200 + 1500 * k), off + t - 0.2, -22 + 12 * k, pan=0.1)
        # parent pushes
        for t in e.get("pushes") or []:
            m.add(thump(120, 70, 0.2, 0.3), off + t, -16)
        if e.get("t_shove") is not None:
            ts = e["t_shove"]
            m.add(thump(110, 42, 0.5, 1.0), off + ts, -3)              # SHOVE
            m.add(whoosh(0.7, 300, 3200, 0.35), off + ts + 0.02, -6)
            for k, dt in enumerate((0.47, 0.67, 0.87)):                 # dad steps aside
                m.add(steps[k % len(steps)], off + ts + dt, -12, pan=0.35)
        if e.get("t_release") is not None:
            tr, tre, tl = e["t_release"], e["t_reenter"], e["t_land"]
            m.add(slide_whistle(520, 1900, min(0.75, tre - tr)), off + tr, -15, pan=-0.1)
            m.add(whoosh(0.6, 500, 3800, 0.3), off + tr, -10)
            fall = tl - tre
            m.add(slide_whistle(1800, 360, fall), off + tre, -16, pan=-0.3)
            m.add(real_thud(), off + tl, 0, pan=-0.25)                  # LANDING (real)
            m.add(thump(80, 36, 0.6, 0.8), off + tl, -4, pan=-0.25)
            m.add(pop(), off + tl + 0.12, -10, pan=-0.25)
        # camera cuts: tension sting into the close-up, light swishes elsewhere
        for i, c in enumerate(e.get("cuts", [])):
            if sid != "mom" and i == 0:
                m.add(sting(), off + c, -6)
                m.add(whoosh(0.22, 1200, 5000, 0.8), off + c - 0.2, -18)
            else:
                m.add(whoosh(0.2, 1500, 6000, 0.7), off + c - 0.15, -24)

    mixL, mixR = m.L, m.R
    # gentle bus limiter
    peak = max(np.max(np.abs(mixL)), np.max(np.abs(mixR)))
    st = np.stack([mixL, mixR], 1)
    st = np.tanh(st / peak * 1.6) / np.tanh(1.6) * 0.92
    pcm = (st * 32767).astype(np.int16)
    import wave
    w = wave.open(out, "wb")
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
    w.close()
    print("OK", out, round(total, 2), "s")


if __name__ == "__main__":
    main()
