"""Join rendered shots into one vertical MP4 with per-shot captions.

usage: python3 assemble.py SCENARIO.json OUT.mp4 [--out DIR]
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import fonts  # noqa: E402


def caption_png(text, w, h, path):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    size = int(w * 0.068)
    f = fonts.load(size)
    tw = d.textlength(text, font=f)
    d.text(((w - tw) / 2, h * 0.115), text, font=f, fill="white",
           stroke_width=max(2, size // 10), stroke_fill="black")
    img.save(path)


def main():
    if len(sys.argv) < 3 or sys.argv[1] in ("-h", "--help"):
        print(__doc__.strip())
        print("  --out DIR     where build.py rendered the shots (default: ./out)")
        print("  --audio WAV   finished mix from audio_mix.py (otherwise: scenario music only)")
        print("  env CAPTION_FONT=/path/to/bold.ttf to choose the caption font")
        sys.exit(0 if len(sys.argv) > 1 else 1)
    scen, out = sys.argv[1], sys.argv[2]
    audio = sys.argv[sys.argv.index("--audio") + 1] if "--audio" in sys.argv else None
    out_dir = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(os.getcwd(), "out")
    sc = json.load(open(scen))
    w, h = sc["size"]
    fps = sc["fps"]
    parts = []
    for s in sc["shots"]:
        cap = os.path.join(out_dir, f"cap_{s['id']}.png")
        caption_png(s["caption"], w, h, cap)
        part = os.path.join(out_dir, f"part_{s['id']}.mp4")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps),
                        "-i", os.path.join(out_dir, s["id"], "f_%04d.png"), "-i", cap,
                        "-filter_complex", "[0][1]overlay=0:0,format=yuv420p",
                        "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", part], check=True)
        parts.append(part)
    lst = os.path.join(out_dir, "parts.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    silent = os.path.join(out_dir, "video_silent.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-c", "copy", silent], check=True)
    if audio:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", silent, "-i", audio, "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out],
                       check=True)
        print("OK", out)
        return
    mu = sc.get("music")
    if not mu:
        os.replace(silent, out)
        print("OK", out)
        return
    total = sum(s["duration"] for s in sc["shots"])
    m0, m1 = mu.get("mute_from", total), mu.get("resume_at", total)
    end_fade = min(0.5, total - m1) if m1 < total else 0.5
    fc = (f"[1:a]asplit=2[x][y];"
          f"[x]atrim=0:{m0},asetpts=PTS-STARTPTS,afade=t=out:st={m0 - 0.1:.3f}:d=0.1[a];"
          f"[y]atrim={m1}:{total},asetpts=PTS-STARTPTS,afade=t=in:d=0.04,"
          f"afade=t=out:st={max(0, total - m1 - end_fade):.3f}:d={end_fade:.3f},"
          f"adelay={int(m1 * 1000)}|{int(m1 * 1000)}[b];"
          f"[a][b]amix=inputs=2:normalize=0,dynaudnorm=f=200:g=9:m=6,volume={mu.get('gain', 1.0)},atrim=0:{total}[m]")
    if m0 >= total:
        fc = f"[1:a]atrim=0:{total},afade=t=out:st={total - 0.5}:d=0.5,volume={mu.get('gain', 1.0)}[m]"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", silent, "-i", os.path.join(HERE, mu["file"]),
                    "-filter_complex", fc, "-map", "0:v", "-map", "[m]", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out], check=True)
    print("OK", out)


if __name__ == "__main__":
    main()
