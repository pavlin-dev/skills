# Free AI music and sound

The user wants generated music from a free website, catchy, with a clear beat.

1. **ACE-Step on Hugging Face** via `gradio_client` (installed in `/workspace/persistent/turbl-yt-54af/pylibs`, run with `/workspace/turbl-video/.venv/bin/python`):
   - `ACE-Step/ACE-Step` (`/__call__`, fast) — uses the shared anonymous ZeroGPU quota, often exhausted ("exceeded your ZeroGPU quota").
   - `WeReCooking/ACE-Step-CPU` (`/generate`, has a `bpm` parameter) — no quota, ~5–6 min per track. It returns only ~16 s of music (rest of the ~30 s file is silence) even when asked for 22 s.
   - `scripts/gen_music.py gpu|cpu <style>…` handles both. Start one GPU try and a `nohup … cpu … &` job **at the very beginning**, then capture footage while it runs. The GPU quota typically allows one track. System `python3` has no PIL/gradio — use the venv + `PYTHONPATH` above.
2. **boppy.me** (no signup) — a few songs per day, then "That's all for today".
3. Prompt: genre + "punchy four-on-the-floor kick, snappy claps, catchy synth hook, <mood>, sports/tech promo, instrumental", lyrics `[Instrumental]`. Generate 2+ variants.
4. Measure with `scripts/beats.py <file>`: prefer the track where the kick-band and full-band tempo/phase agree and the kick score is high; a weak or syncopated kick makes beat-sync look wrong. (claude2video: GPU pop track 117.5 BPM, kick score 1.4, phases disagree → rejected; CPU house 120 BPM, kick score 10, phases agree → used.)
5. Too short? `scripts/extend.py <src> <phase> <out.wav> [bpm] [seconds]` repeats whole bars on the bar grid with short crossfades; the output's first beat is at −0.016 s, so `music.json` = `{"bpm": …, "b0": -0.016}`. Re-run `beats.py` on the result to confirm.
6. Mix with `scripts/audio.py` (template): music + synthesized SFX at beat times, low-pass/duck during slow-mo, fade the last 0.4 s. A web-tool variant (problem low-pass, file drop, click, progress ticks, CTA rays) is `/workspace/persistent/c2v-promo/tools/audio.py`.

Tell the user which site generated the music. You can't listen to it, so say so and let them judge how catchy it is.

## Sound effects

Synthesize them with numpy (`scripts/audio.py`: pock, whoosh, impact, thump, tick, ding, click) at beat times, ~10 dB under the music; `render.sh` loudnorms the mix to −14 LUFS.
