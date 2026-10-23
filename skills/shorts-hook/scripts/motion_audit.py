#!/usr/bin/env python3
"""Find the dead spots of a vertical short: stretches where the picture barely changes, and a weak first second.

usage: motion_audit.py <video> [--max-still 3.0] [--thresh auto] [--fps 4] [--sheet hook.png] [--hook 3]

You can't watch the video, so measure it. The picture is sampled --fps times a second at low resolution, the
caption band (top 22 %) and the platform UI band (bottom 15 %) are masked out, and each sample is compared with
the previous one (mean absolute difference, 0-255). Living/boiling lines, grain and slow drifts give a small
baseline; a cut, a zoom, an object entering or a camera move gives much more. --thresh auto = 2.2 x the 20th
percentile of all differences (at least 2.0).

Prints:
  - a per-second activity strip ('#' strong change, '+' change, '.' still)
  - every stretch longer than --max-still seconds without a change above the threshold (fix these)
  - the hook check: is there a clear change in the first second, and how alive are the first 2 s
--sheet writes a contact sheet of the first --hook seconds (every 0.25 s) to look at the opening frame by frame.

Needs: ffmpeg/ffprobe. No Python packages.
"""
import argparse, subprocess, sys

if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 else 1)
ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('video'); ap.add_argument('--max-still', type=float, default=3.0); ap.add_argument('--thresh', default='auto')
ap.add_argument('--fps', type=float, default=4); ap.add_argument('--sheet'); ap.add_argument('--hook', type=float, default=3.0)
a = ap.parse_args()

W, H = 54, 96
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.video, '-vf', f'fps={a.fps},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'],
                     capture_output=True, check=True).stdout
n = len(raw) // (W * H)
if n < 3: sys.exit('video too short or unreadable')
y0, y1 = int(H * 0.22), int(H * 0.85)
def diff(i):
    p, q = raw[(i - 1) * W * H:i * W * H], raw[i * W * H:(i + 1) * W * H]
    return sum(abs(p[k] - q[k]) for k in range(y0 * W, y1 * W)) / ((y1 - y0) * W)
d = [0.0] + [diff(i) for i in range(1, n)]
srt = sorted(d[1:])
th = max(2.0, 2.2 * srt[len(srt) // 5]) if a.thresh == 'auto' else float(a.thresh)
dt = 1 / a.fps
dur = n * dt

# activity strip, one character per second
strip = ''
for s in range(int(dur + 0.999)):
    m = max(d[int(s * a.fps):int((s + 1) * a.fps)] or [0])
    strip += '#' if m >= 3 * th else '+' if m >= th else '.'
print(f'threshold {th:.1f}   duration {dur:.1f} s   (# strong change, + change, . still; one char per second)')
for i in range(0, len(strip), 10): print(f'{i:>4}s  {strip[i:i + 10]}')

# still stretches
stills, start = [], None
for i in range(1, n + 1):
    moving = i < n and d[i] >= th
    if not moving and start is None: start = (i - 1) * dt
    if (moving or i == n) and start is not None:
        end = (i - 1) * dt if moving else dur
        if end - start >= a.max_still: stills.append((start, end))
        start = None
print()
if stills:
    print(f'STILL for more than {a.max_still:g} s (add a change: camera move, new element, cut, zoom, reveal):')
    for s, e in stills: print(f'  {s:5.1f} - {e:5.1f} s  ({e - s:.1f} s)')
else:
    print(f'no stretch longer than {a.max_still:g} s without a change')

# hook
first = d[1:int(a.fps) + 1]; two = d[1:int(2 * a.fps) + 1]
peak1 = max(first or [0]); mean2 = sum(two) / max(1, len(two))
print()
print(f'hook: strongest change in the first second {peak1:.1f} (threshold {th:.1f}), mean activity in the first 2 s {mean2:.1f}')
if peak1 < th: print('  WEAK OPENING: nothing clearly moves or changes in the first second. Start in motion (see SKILL.md, section 3).')
elif mean2 < th: print('  The first second moves, but the opening settles too soon; keep it alive through the first 2-3 s.')
else: print('  ok: the opening is in motion.')

if a.sheet:
    k = int(a.hook * 4) + 1
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', a.video, '-vf', f'fps=4,trim=duration={a.hook + 0.01},scale=216:-1,tile={min(k, 7)}x{(k + 6) // 7}',
                    '-frames:v', '1', a.sheet], check=True)
    print(f'\nhook sheet ({a.hook:g} s, every 0.25 s): {a.sheet}')
