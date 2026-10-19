---
name: engaging-video
description: How to make short, engaging vertical promo videos (Reels/Shorts/TikTok, 1080×1920) with motion graphics in Remotion, real product footage and free AI-generated music synced to the beat. Use whenever the user asks for a promo video, short, reel, teaser, product demo video or "motion" animation, or says a video is boring, unclear or needs music.
---

# Engaging short videos

A short video has about one second to tell the viewer what it is about, and about one second per idea after that. Every frame has to either explain the product or carry the viewer to the next frame. A slideshow of nice stills is boring, no matter how good the stills are.

## What makes it engaging (learned the hard way)

1. **Say what it is in the very first frame.** Frame 0 must already show the category and the promise ("ONE SENTENCE → VR GAME", "Build a **VR** padel court…"). Never let text fade in from nothing at t=0: start entrance animations at negative time so frame 0 is readable. If the product is VR, AI, a game, etc., that word has to be on screen and visually emphasized immediately.
2. **One subject.** One product or one demo per video (e.g. only the Padel Pro example), not a tour of features. 15–25 s is the target. Ask the user for the length if unsure, default 20 s.
3. **One connecting motif.** Pick a physical object from the subject (a ball, a cursor, the logo, a link pill) and let it travel through the whole video. Every transition is caused by it: it bounces on words, gets smashed into the lens and becomes a round portal into the next shot, streaks across a cut, pushes a frame aside, and finally lands as the dot in the URL. This "everything is connected" feeling is what users mean by "motion animation".
4. **No plain cuts.** Each scene change is motivated by motion: portal/iris from an object, zoom-through with blur, whip-pan push, match cut on the same shape, a headset visor closing and opening. Keep elements alive across the cut (the link pill morphs into the CTA URL bar instead of disappearing).
5. **Everything on the beat.** Pick music with a clear, steady kick, measure its exact BPM and phase, and put every landing, cut, word reveal and flash on a beat. Use bars as the unit of scene length (at 120 BPM, 1 bar = 2 s).
6. **Show the real product.** Use actual footage of the product. Clean, full-bleed vertical footage beats upscaled screen recordings in a card. Avoid footage with baked-in captions.
7. **Text is short and for the viewer.** Max ~4 words per caption, one caption per scene, big (100–150 px Geist ExtraBold), with a brand-colored period. Follow the `user-facing-copy` skill. Take claims (free credits, devices) from the product's own website, never invent them.
8. **Moments of contrast.** One slow-motion beat (with the music low-passed and ducked) or one breakdown makes the rest feel faster. Add a punch: flash + shockwave + racket/impact sound on the key hit.
9. **Sound design is half of it.** Add a sound for every visible motion: bounce "pocks", whooshes on transitions, a hit/boom on impacts, a click on buttons, a ding on score/CTA. Synthesize them (numpy), keep them ~10 dB under the music, loudnorm the final mix to −14 LUFS.
10. **End with a clear CTA**: logo, one question or promise, a button ("Start for free"), the URL. Hold it for 3–4 s.

## Storyboard template (20 s, 120 BPM, 10 bars)

| bars | time | scene | transition out |
|---|---|---|---|
| 0–1 | 0–4 s | Hook: the prompt sentence, motif hops word to word on each beat and lights it up; category label on top from frame 0 | motif smashes into the camera |
| 2–3 | 4–8 s | Product builds itself (real footage), feature chips pop on beats | zoom-through + motif streak |
| 4 | 8–10 s | Refine: chat bubble "Add …", caption "Just ask." | visor/iris closes |
| 5–6 | 10–14 s | Use it: first-person footage, slow-mo on the hit, score pop | motif pushes the frame sideways |
| 7 | 14–16 s | Share: link pill, cursor clicks "Copy link" | pill morphs into URL bar |
| 8–9 | 16–20 s | CTA: logo assembles, headline, button, motif lands as the dot in the URL | fade |

Write the plan for the user before building, but don't wait for approval on small choices.

## Tooling

### Remotion (motion graphics)

- Use Remotion (React → video). A working project to copy from: `/workspace/persistent/turbl-padel-20s` (composition `Padel20`, effects in `src/fx.tsx`: `Reveal`, `Mono`, `Chip`, `World` background, `Flash`, `Shockwave`, `Iris`, `BrandWipe`, `Grain`, `Vignette`). Copy `package.json` + `node_modules` from it instead of installing.
- Drive everything from time, not frames: `const t = frame / FPS`, `const b = k => b0 + BEAT * k`, tweens via `tw(t, t0, dur, easing)`. Scene boundaries are constants in beats, so changing the music's phase moves everything consistently. Keep `music.json` = `{bpm, b0, file}`.
- Footage: `<Sequence from><OffthreadVideo playbackRate startFrom/></Sequence>`; set `playbackRate = sourceLength / sceneLength` to fit a shot exactly into its bars.
- Pixel-precise layouts (e.g. where each word is, so a ball can land on it): measure text with PIL from the same TTF (`getlength` + letter-spacing) and write a JSON the composition imports.
- Check stills before rendering: `npx remotion bundle src/index.ts --out-dir=build`, then `npx remotion still build <Comp> out.png --frame=N --scale=0.3`, tile them with ffmpeg and look at them. Check the exact frames of landings, cuts and frame 0.

### Rendering on this machine

- The machine is rebuilt when idle, which kills background jobs and wipes everything outside `/workspace`. Keep projects in `/workspace/persistent/<name>` and **render in the foreground** with `scripts/render.sh` (chunks of 1 s, resumable, max 10 min per tool call, re-run until `ALLDONE`).
- Concurrency must not exceed the cgroup CPU limit (`/sys/fs/cgroup/cpu.max`, often 2 even when `nproc` says 8); `render.sh` reads it.
- To fix one part, delete only the affected chunks (`out/chunks/cN.mp4` = second N) and re-run.
- `show_file` refuses files over 25 MB; `render.sh` also writes a `-share.mp4` at ~7 Mbit/s.

### Clean 3D footage of a web scene

`scripts/rec3d.mjs` opens a Turbl/three.js scene in headless Chromium, freezes time, sets a scripted camera per frame and saves 1080×1920 JPEGs (config JSON: `out`, `shots[{name, frames, keys:[{pos, look, fov}], ease, build}]`, optional `buildFn` to animate the scene assembling). Software rendering is slow (~3 s/frame), so record only what you need. Existing Padel Pro shots: `/workspace/persistent/turbl-padel-20s/public/pp_*.mp4`.

### Free AI music

The user wants generated music from a free website, catchy, with a clear beat.

1. **ACE-Step on Hugging Face** via `gradio_client` (installed in `/workspace/persistent/turbl-yt-54af/pylibs`, run with `/workspace/turbl-video/.venv/bin/python`):
   - `ACE-Step/ACE-Step` (`/__call__`, fast) — uses the shared anonymous ZeroGPU quota, often exhausted ("exceeded your ZeroGPU quota").
   - `WeReCooking/ACE-Step-CPU` (`/generate`, has a `bpm` parameter) — no quota, ~6 min per track. See `scripts/gen_cpu.py`. It returns only ~16 s of music even when asked for 22 s.
2. **boppy.me** (no signup) — a few songs per day, then "That's all for today".
3. Prompt: genre + "punchy four-on-the-floor kick, snappy claps, catchy synth hook, <mood>, sports/tech promo, instrumental", lyrics `[Instrumental]`. Generate 2+ variants.
4. Measure with `scripts/beats.py <file>`: prefer the track where the kick-band and full-band tempo/phase agree; a weak or syncopated kick makes beat-sync look wrong.
5. Too short? `scripts/extend.py <src> <phase> <out.wav>` repeats whole bars on the bar grid with short crossfades.
6. Mix with `scripts/audio.py` (template): music + synthesized SFX at beat times, low-pass/duck during slow-mo, fade the last 0.4 s.

Tell the user which site generated the music. You can't listen to it, so say so and let them judge how catchy it is.

## Before sending

- Frame 0 tells what it is; the key word (VR, AI, …) is visible and emphasized.
- Contact sheet (2 fps) of the final file: no empty frames, no overlapping texts in morphs, captions not covered by the motif, nothing important in the bottom ~350 px (platform UI).
- Every scene change is motivated by motion; the motif appears in every transition.
- Landings and cuts sit on beats; loudness ≈ −14 LUFS; exactly the planned length.
- Send the `-share.mp4` with `show_file`, give the path to the full-quality file, and list what you could not check (e.g. listening).
