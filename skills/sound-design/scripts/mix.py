#!/usr/bin/env python3
"""Mix voice, music, effects and ambience by loudness targets relative to the voice, then master.

usage: mix.py --vo vo.wav [--music music.wav] [--fx fx.wav] [--amb amb.wav] --out out.mp4|out.wav
              [--video video.mp4] [--music-db -10] [--fx-db -15] [--amb-db -24] [--duck 8]
              [--lufs -14] [--tp -1.5]

Every stem is measured (EBU R128, gated, so silence does not count) and set relative to the voice:
  music     --music-db under the voice, ducked a further --duck dB while the voice speaks
            (about 16 dB under it overall, 18 under words), dipped 3 dB at 2.5-5 kHz where
            speech intelligibility lives
  fx        --fx-db under the voice (short punctuation: ticks, pops, impacts)
  amb       --amb-db under the voice (beds: engines, wind, room), stepping back 4 dB under
            words (about 27 dB under it overall)
The voice gets a high-pass at 80 Hz and gentle compression. The sum is gained to --lufs and
true-peak limited. With --video the mix is muxed into a copy of the video (video stream copied),
otherwise a 48 kHz WAV is written. Prints the measured loudness of every stem after ducking.

Needs: ffmpeg, `pip install numpy`.
"""
import argparse, os, re, subprocess, sys, tempfile, wave

if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 else 1)
import numpy as np

ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('--vo', required=True); ap.add_argument('--music'); ap.add_argument('--fx'); ap.add_argument('--amb')
ap.add_argument('--out', required=True); ap.add_argument('--video')
ap.add_argument('--music-db', type=float, default=-10); ap.add_argument('--fx-db', type=float, default=-15)
ap.add_argument('--amb-db', type=float, default=-24); ap.add_argument('--duck', type=float, default=8)
ap.add_argument('--lufs', type=float, default=-14); ap.add_argument('--tp', type=float, default=-1.5)
a = ap.parse_args()
SR = 48000
VO_CHAIN = 'highpass=f=80,acompressor=threshold=-24dB:ratio=3:attack=5:release=150:makeup=2,alimiter=limit=0.7:level=false'

def load(p, af='anull'):
    raw = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', p, '-af', af, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
    return np.frombuffer(raw, np.float32).astype(np.float64)
def lufs(x):
    err = subprocess.run(['ffmpeg', '-nostdin', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                         input=x.astype(np.float32).tobytes(), capture_output=True).stderr.decode()
    v = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])
    return v if v > -69 else None  # silent stem
def set_lufs(x, target):
    v = lufs(x); return x * 10 ** ((target - v) / 20) if v is not None else x
def voice_activity(x, att=0.08, rel=0.4):
    hop = SR // 100
    rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, 'same'))[::hop]
    act = (rms > rms.max() * 0.06).astype(float); e = np.zeros_like(act); v = 0.0
    for i, s in enumerate(act):
        v += (s - v) * (1 - np.exp(-1 / ((att if s > v else rel) * 100))); e[i] = v
    return np.interp(np.arange(len(x)) / hop, np.arange(len(e)), e)
def dip(x, lo=2500, hi=5000, db=-3):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f > lo) & (f < hi)] *= 10 ** (db / 20); return np.fft.irfft(X, len(x))

stems = {'voice': load(a.vo, VO_CHAIN)}
for k, p in (('music', a.music), ('fx', a.fx), ('amb', a.amb)):
    if p: stems[k] = load(p)
n = max(len(x) for x in stems.values())
stems = {k: np.pad(x, (0, n - len(x))) for k, x in stems.items()}
V = -20.0
stems['voice'] = set_lufs(stems['voice'], V)
act = voice_activity(stems['voice'])
if 'music' in stems: stems['music'] = set_lufs(dip(stems['music']), V + a.music_db) * 10 ** (-a.duck * act / 20)
if 'fx' in stems: stems['fx'] = set_lufs(stems['fx'], V + a.fx_db)
if 'amb' in stems: stems['amb'] = set_lufs(stems['amb'], V + a.amb_db) * 10 ** (-4 * act / 20)
for k, x in stems.items():
    v = lufs(x); print(f'{k:6s} {v:6.1f} LUFS' + (f'  ({v - V:+.1f} dB vs voice)' if k != 'voice' and v else '') if v else f'{k:6s} silent')

mix = sum(stems.values())
mix = mix * 10 ** ((a.lufs - lufs(mix)) / 20)
fd, tmp = tempfile.mkstemp(suffix='.f32'); os.close(fd)
mix.astype(np.float32).tofile(tmp)
src = ['-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', tmp]
def true_peak(path):  # dBTP of the encoded file (AAC encoding can push peaks over the limiter's ceiling)
    err = subprocess.run(['ffmpeg', '-nostdin', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True).stderr.decode()
    return float(re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', err)[-1].replace('-inf', '-99'))
ceiling = a.tp - 0.5
for attempt in range(4):  # oversampled limiter, then measure the real file and tighten if it still overshoots
    af = f'aresample=192000,alimiter=limit={10 ** (ceiling / 20):.4f}:level=false:attack=1:release=50,aresample=48000'
    if a.video:
        cmd = ['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', a.video, *src, '-filter_complex', f'[1]{af}[a]',
               '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', a.out]
    else:
        cmd = ['ffmpeg', '-nostdin', '-y', '-v', 'error', *src, '-af', af, '-c:a', 'pcm_s16le', a.out]
    subprocess.run(cmd, check=True)
    tp = true_peak(a.out)
    if tp <= a.tp: break
    ceiling -= tp - a.tp + 0.2
os.remove(tmp)
print(f'true peak {tp:.1f} dBTP (target {a.tp})')
print(f'master {lufs(load(a.out)):.1f} LUFS -> {a.out}')
