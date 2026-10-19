#!/usr/bin/env python3
"""Split one voice-over take into script lines and get word timings, without listening to it.

Usage:
  vo_align.py <take.wav> <script.txt> <out_dir> [--model medium] [--lang cs] [--squeeze 0.35]

script.txt has one line per VO line, "id|text" (e.g. "l1|Zítra má Bára narozeniny.").
Audio tags like <long pause> or <laugh> are ignored for matching.

The take is transcribed with faster-whisper (word timestamps), the transcript is
aligned to the script word by word (fuzzy, so small mis-hearings don't matter), and:
  <out_dir>/<id>.wav    one file per line (48 kHz mono, short fades)
  <out_dir>/align.json  per line: start/end in the take, duration, and each script
                        word with its time relative to the line start
  stdout                the transcript next to the script, for checking the take

--squeeze S shortens every silence in the take longer than S seconds to S before anything else
(written to <out_dir>/take_squeezed.wav). Use it for TTS takes that leave ~0.8 s after every
sentence; it also shortens performed dramatic pauses, so add those back with vo_timeline.py --extra.
Words heard as digits ("1983" for "tisíc devět set osmdesát tři") are not flagged.

Needs: ffmpeg, `pip install faster-whisper numpy`. The model is downloaded on first
use (set HF_HOME or --download-root to choose where).
"""
import argparse, difflib, json, os, re, subprocess, sys, unicodedata

def norm(w):
    w = unicodedata.normalize("NFKD", w.lower())
    w = "".join(c for c in w if not unicodedata.combining(c))
    return re.sub(r"[^\w]", "", w)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("take"); ap.add_argument("script"); ap.add_argument("out_dir")
    ap.add_argument("--model", default="medium", help="faster-whisper model (small is faster, medium is more exact)")
    ap.add_argument("--lang", default="cs")
    ap.add_argument("--download-root", default=None)
    ap.add_argument("--pad", type=float, default=0.12, help="seconds kept before the first and after the last word")
    ap.add_argument("--squeeze", type=float, default=0, help="shorten silences longer than this (s) to this; 0 = off")
    a = ap.parse_args()
    if a.squeeze > 0:
        os.makedirs(a.out_dir, exist_ok=True)
        sq = os.path.join(a.out_dir, "take_squeezed.wav")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.take, "-af",
                        f"silenceremove=stop_periods=-1:stop_duration={a.squeeze}:stop_threshold=-45dB:stop_silence={a.squeeze}",
                        "-ar", "48000", "-ac", "1", sq], check=True)
        a.take = sq

    import numpy as np
    from faster_whisper import WhisperModel

    lines = []
    for raw in open(a.script, encoding="utf-8"):
        if "|" in raw:
            i, t = raw.rstrip("\n").split("|", 1)
            lines.append((i.strip(), re.sub(r"<[^>]*>", " ", t)))
    if not lines:
        sys.exit("script has no 'id|text' lines")

    sr = 16000
    pcm = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-i", a.take, "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"])
    audio = np.frombuffer(pcm, np.float32)
    total = len(audio) / sr

    model = WhisperModel(a.model, device="cpu", compute_type="int8", download_root=a.download_root)
    segs, _ = model.transcribe(audio, language=a.lang, word_timestamps=True, beam_size=5)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
    print("HEARD :", " ".join(h[0] for h in heard))

    script = [(li, w) for li, (_, t) in enumerate(lines) for w in t.split() if norm(w)]
    sm = difflib.SequenceMatcher(None, [norm(w) for _, w in script], [norm(h[0]) for h in heard], autojunk=False)
    match = {}
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op in ("equal", "replace"):  # replace = mis-heard words, map them pairwise
            for k in range(min(i2 - i1, j2 - j1)):
                match[i1 + k] = j1 + k

    os.makedirs(a.out_dir, exist_ok=True)
    out = []
    for li, (lid, text) in enumerate(lines):
        idx = [k for k, (l, _) in enumerate(script) if l == li]
        hit = [match[k] for k in idx if k in match]
        if not hit:
            print(f"WARN  {lid}: no words recognised, check the take", file=sys.stderr)
            continue
        # every heard word up to the next line's first word belongs to this line
        # (whisper may split one word into two, e.g. "tmavo vláska")
        nxt = [match[k] for k in range(idx[-1] + 1, len(script)) if k in match]
        j0, j1 = min(hit), (nxt[0] - 1 if nxt else len(heard) - 1)
        st = max(0.0, heard[j0][1] - a.pad)
        en = heard[j1][2] + a.pad
        if nxt:
            en = min(en, heard[nxt[0]][1] - 0.03)
        en = min(en, total)
        words = [{"word": w, "t": round(heard[match[k]][1] - st, 3) if k in match else None} for k, (_, w) in zip(idx, [script[k] for k in idx])]
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.take, "-ss", f"{st:.3f}", "-to", f"{en:.3f}",
                        "-af", "afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse", "-ar", "48000", "-ac", "1",
                        os.path.join(a.out_dir, f"{lid}.wav")], check=True)
        out.append({"id": lid, "start": round(st, 3), "end": round(en, 3), "dur": round(en - st, 3), "words": words})
        said = [heard[j][0] for j in range(j0, j1 + 1)]
        want = [w for w in text.split() if norm(w)]
        diffs = []
        for op, i1, i2, k1, k2 in difflib.SequenceMatcher(None, [norm(w) for w in want], [norm(w) for w in said], autojunk=False).get_opcodes():
            x, y = " ".join(want[i1:i2]), " ".join(said[k1:k2])
            if re.fullmatch(r"[\d\s.,:/%-]+", y or "-x"):  # numbers written as digits by whisper
                continue
            if op != "equal" and difflib.SequenceMatcher(None, norm(x), norm(y)).ratio() < 0.75:
                diffs.append(f"'{x}' -> '{y}'")
        print(f"{lid:>5} {st:7.2f}-{en:6.2f}  {text.strip()}")
        if diffs:
            print(f"{'':>22}LISTEN: script vs heard: {'; '.join(diffs)}")
    json.dump(out, open(os.path.join(a.out_dir, "align.json"), "w"), ensure_ascii=False, indent=1)
    print(f"wrote {len(out)} lines to {a.out_dir}")

if __name__ == "__main__":
    main()
