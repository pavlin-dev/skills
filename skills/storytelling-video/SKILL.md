---
name: storytelling-video
description: How to make a short narrated story video that promotes nothing (a true story, a piece of history, a disaster, a "how did that happen" moment) for YouTube Shorts, Reels or TikTok - finding a story people watch to the end, the hook, the escalation and payoff, the length, checking the facts, and visual styles - a living pen drawing (template included: ink.js, scenes driven by the voice-over's word times, rendered frame by frame in a headless browser), motion design, or a coloured cartoon world (see `cartoon-world-video`). Use whenever the user wants a storytelling video, a story/history/explainer short, "a video people enjoy watching", a non-promotional narrated short, or the pen/hand-drawn animated style.
---

# Storytelling video

A story video lives or dies on two things: whether the first sentence makes people stay, and whether the voice sounds like a person. Everything here comes from making such videos with a user: a pen-drawn story of the Gimli Glider (the user loved the style, the sound only after it was re-mixed) and a motion-design story of Stanislav Petrov.

For a story that should sell a product, use the `marketing-storytelling-video` skill instead; it builds on this one.

## 1. Pick a story people finish

- **Real and specific beats invented and generic.** A real event with a date, a place and a person; the viewer thinks "this happened".
- **A chain of small, human mistakes** works very well: each step is understandable, together they escalate into something absurd ("one unit mix-up, and a Boeing runs out of fuel at 12 km"). Also good: one person's decision under pressure, an unlikely rescue, a twist nobody expects.
- Avoid the most retold stories of the genre unless you have a new angle; dozens of channels already did them.
- **Check the facts** before writing the script: every number, date, name and cause. Search for sources when you can and list them for the user; when you can't, list every fact as unverified. In a "this is true" format one wrong fact in the comments kills the credibility of the whole channel.

## 2. Structure and length

| Beat | Time | What it does |
|---|---|---|
| Hook | 0-3 s | Stakes or the absurd outcome, not background info. "Tahle noc mohla skončit jadernou válkou." beats "Dvanáct a půl kilometru nad Kanadou." Write and pick it with the `shorts-hook` skill. |
| Setup | 1 line | Who, where, when, in one sentence. |
| Escalation | 2-4 beats | Each beat worse than the last; one visual per beat. |
| Turn | 1-2 lines | The decision, the twist, the cause revealed. A pause before it. |
| Payoff | 1-2 lines | How it ended; relief or irony. |
| Closer | 1 line | Ties it to the viewer or names the story ("Letadlu se dodnes říká Gimli Glider."). No end card, no "subscribe". |

- **Length: 30-45 s.** 50 s and more loses people on Shorts. Count words before generating the voice: about 2.5 words per second for a performed take, so **75-100 words**. A directed Gemini take reads slower and more dramatically than a TTS placeholder: 109 words became 57 s.
- Explaining parts (units, mechanisms) are where people scroll away: keep them to one line each and make the picture do the work.
- Write the script for the ear and get the voice with the `voice-over` skill. Never deliver the film with a placeholder voice (see that skill).

## 3. Visual style A: living pen drawing (template)

Black ink lines on paper that wobble slightly 12 times a second ("line boil"), drawn on in front of the viewer as the voice reaches them, one red accent for what matters, handwritten captions. The user picked it over a shadow-theatre style and called the result "pěkné".

- **The pen draws what the voice says.** Every reveal is tied to a spoken word (`atL('lineId', 'word')`): the needle drops on "spadne", the name gets circled on "Gimli".
- **One panel per line** on a long sheet of paper; the camera pans to the next panel 0.35 s before its line, so the pen starts with the voice. A slow push-in keeps still drawings alive. Short camera shakes on impacts.
- **Draw what a pen does well:** objects, diagrams, maps, gauges, notes with numbers, stick figures and crowds, before/after, arrows. Avoid faces and acting characters; turn ideas into objects (a fuel gauge, a notepad with "22 300 kg / 22 300 lb", a tank filled to half).
- **One accent colour** (red) for the single most important thing on screen: the wrong unit circled, the dead needle, the verdict underlined.
- Layout for 1080x1920: drawings between y 250 and 1350, captions around y 1520 (the bottom ~300 px is covered by the platform UI).
- Captions: 1-3 words, the spoken word in red with a small pop; feeds autoplay muted, so they are never optional.

### Using the template

```
cp -r template/ myfilm/ && bash scripts/fetch_fonts.sh myfilm
# timeline.json from the voice-over skill (vo_align.py, then vo_timeline.py) replaces the example
# write one scene per line id in myfilm/scenes.js
node scripts/render.mjs myfilm/index.html stills/ --frames 30,150,300   # check single frames
node scripts/render.mjs myfilm/index.html video.mp4                      # full render, no audio
```

- `template/ink.js`: helpers, shapes (`pathPoints`, `rectPts`, `circlePts`, `cloudOutline`), the pen (`ink` with draw-on `k` and fill, `hand` for handwriting, `ringScribble`, `underline`, `tickMark`, `scribbleFill`, `hatch`, `stick`, `cloud`), timeline lookups (`at`, `atL`), captions (respect the `show` field from `vo_timeline.py --show`, e.g. the voice says "tisíc devět set osmdesát tři", the caption shows "1983") and the frame engine (`startFilm(canvas, scenes, opts)`).
- `template/scenes.js`: three example scenes showing the patterns. Replace them; keep each scene a pure function of its local time `t`.
- `scripts/render.mjs` serves the folder, calls `renderFrame(t)` for every frame and pipes PNGs to ffmpeg. It needs Playwright for Node (`npm i playwright`, or a global install) and a Chromium (`npx playwright install chromium`, or `CHROME_PATH`). 40 s at 30 fps renders in a few minutes on a CPU.
- Check stills at the end of every line before the full render: text cut off at the panel edge, a reveal that only completes after the camera has left, drawings overlapping the caption area.

## 4. Visual style B: motion design

One hero shape that morphs through the story (globe → radar → phone dial → clock → sun → globe), one shared camera, colour blooms between parts. Follow the `motion-design-video` skill. It worked for the Petrov story; keep the hero element large (it read small at 60 % of the width) and the captions big.

## 4b. Visual style C: coloured cartoon world

A colourful cartoon look (living outlines, shaded fills, label boxes, a mascot) where the whole film is one continuous world under one camera. Follow the `cartoon-world-video` skill; it has its own template.

## 5. Sound

Follow the `sound-design` skill: voice as the anchor, few effects and only on story beats, music cut to the story (tape-stop on the failure, muffled while suspended, silence before the payoff, back on the relief line), ambience far under the voice. Never synthesize music. Ask the user for a track, or offer two variants; for a light documentary story a jazzy vibraphone track ("Spy Glass", Kevin MacLeod) won over comedic pizzicato.

## Workflow

1. Story and facts (section 1), with the user if they are around: offer 2-3 candidate stories with a one-line hook each.
2. Script for the ear, 75-100 words (`voice-over`).
3. Voice take from the user (`voice-over`); check it with `vo_align.py`, lay it out with `vo_timeline.py` (`--extra` before the punchline, `--show` for numbers).
4. Scenes keyed to words; stills check; render the picture.
5. Effects and music edit from the same word times; mix and master (`sound-design`).
6. Contact sheet of the final file (`ffmpeg -i final.mp4 -vf "fps=0.5,scale=180:-1,tile=11x2" -frames:v 1 sheet.png`) and look at it.

## Before sending

- Hook and visual pace checked with `shorts-hook` (candidates for the first line, motion in the first second, `motion_audit.py` on the render).

- The hook is stakes or an outcome; 30-45 s; every fact listed as verified (with sources) or not.
- Real voice take, not a placeholder; captions match what is said (numbers via `show`).
- Every reveal lands on its word and completes before the camera pans away.
- Stem levels and master as in `sound-design`; music source, licence and attribution line told to the user; say you could not listen and ask them to check on a phone.
