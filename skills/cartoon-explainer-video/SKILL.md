---
name: cartoon-explainer-video
description: How to design and build vertical videos (1080x1920, Shorts/Reels/TikTok) in a coloured hand-drawn cartoon style - thick living outlines, flat fills with a shade crescent, white label boxes, a reacting mascot in a bubble, white captions on top - where the whole film is ONE continuous world under ONE camera: the subject never leaves the screen, comparisons appear as full-size "ghosts" next to the real thing and fold into it, and the camera travels and zooms through the world instead of cutting. Template included (toon.js drawing kit + camera engine + an example world, rendered frame by frame in a headless browser). Use whenever the user wants this cartoon / "How it works" explainer look, a video "in the style of" a cartoon explainer channel, or says a video looks like separate objects or slides, is "málo propojené", or the world doesn't feel connected.
---

# Cartoon world video (design style)

A coloured cartoon look with one rule above all: **the film is one continuous world, not a series of pictures.** It comes from work with a user who pointed at a cartoon "How It Works" short as the reference. The first version drew one object per line on an empty background, with crossfades between them. The user liked the look but said it was "málo propojené… spíš jen objekty, který představuješ, než že by ten svět byl celistvě propojený". The second version showed the same content as one world (one Earth, one rocket, one telescope, one camera), and the user said it was better. **Continuity is the point; the drawing style is the easy part.**

This skill is about the picture. Story, script and narration come from other skills: `storytelling-video` (what to tell and how long), `voice-over` (the take and its word timeline), `sound-design` (the mix). The same continuity rule drives `motion-design-video` for promos.

## 1. One world, one camera: rules that make it feel connected

1. **One world with a real scale.** Decide units once and place everything in it: ground, buildings, vehicles, the subject. The example uses 1 m ≈ 12 world px, the ground at y = 0, up = -y. Because sizes stay true to each other, zooming out *shows* scale without any text.
2. **One hero that never leaves.** The subject is a single object whose state is a function of time (folded → unfolding → deployed). A close-up means the camera moves into that same object. Never draw a separate picture of one of its parts.
3. **Comparisons are ghosts in the world, at full size, that resolve into the real thing.**
   - "Too wide for a rocket": a translucent full-size mirror grows out of the folded one inside the fairing, and the parts outside the fairing turn red. Then its wings fold back until it matches the real folded mirror, and it fades.
   - "The size of a tennis court": the full-size sunshield slides out of the fairing, a court is laid under it, then the shield folds back in.

   The viewer *sees why* the thing is the way it is. Avoid a comparison on its own empty background.
4. **The camera only moves.** No cuts, no crossfades. Every move is keyed to a spoken word. The camera can follow a moving object and zoom a long way through the same world: from inside a fairing, out to the whole rocket, up with the launch, far out until the planet is a ball and the subject a glint, then back into one hinge.
5. **The environment follows position, physically consistently.** The sky is an atmosphere drawn around the planet, so it turns from dusk to space by itself as the camera climbs. Light comes from where the light source really is: in the example the Sun and the Earth are both below the telescope's sunshield, so the underside glows when the heat is mentioned.
6. **Things leave the way they would.** Fairing halves fly off with a spin (a Christmas hat rides away on one), a spent stage falls behind, smoke stays on the ground where it was made.
7. **Labels belong to world points.** Screen-space label boxes are anchored with `toScreen(x, y)` to the thing they describe. They pop in on the word and go away when the camera leaves that thing.
8. **Far out, mark the subject.** At zoom 0.04 a telescope is smaller than a pixel. A pulsing gold star at its screen position keeps it findable.
9. **Plan the camera's path through the world in one direction.** If the content jumps back and forth in time or place, the camera has to jump too, and the world breaks. When you storyboard, order the beats so the camera travels on. If the script fights that, raise it with the user.

## 2. The look (all in `template/toon.js`)

- **Living outline.** Dark ink (#1f1a2e), redrawn with a new wobble 12 times a second ("line boil").
  - Line width is in *screen* pixels: a 6 px outline stays 6 px at zoom 0.05 or 9.
  - Very small objects get thinner lines instead of turning into blobs.
  - Every shape has its own `seed` so the outlines don't boil in sync.
- **Fills.** Flat colour plus a darker crescent on one side (`dark`, offset `sd`), optionally a light rim on the other (`light`, `lw`). One light direction for the whole film. Light paper grain over the frame.
- **Palette.** Saturated but soft colours: dusk gradients (orange → pink → purple), deep navy space, gold, lilac, white with a cool shade. The base set is in `C`; a world adds its own colours with `Object.assign(C, {...})`.
- **Label boxes.** Short CAPS text ("6.5 m", "5 LAYERS", "NO REPAIRS") in a white box with an outline (`label`). Red, green or blue boxes are for warnings, success and temperatures. They pop in with a small overshoot (`pop`).
- **Icons in the world.** Warning triangle, red X drawn on in two strokes (`redX`), comic impact star (`burst`), thermometer, curved arrows (`stroke` + `arrowHead`). Draw them with the same outline and shading as everything else.
- **Mascot.** A small astronaut in a white bubble, bottom left, whose mood follows the content: ok, happy, worried, shock, no (shakes its head), hot (sweats), shiver. It gives the viewer someone to react with. Keep it out of the action and change it to fit the subject (a different character, same bubble).
- **Captions.**
  - 1-3 words, white with a thick dark outline, near the top (y ≈ 320).
  - The spoken word turns yellow with a small pop; trailing punctuation is hidden.
  - Font: Gaegu Bold; labels use Patrick Hand.
  - Feeds autoplay muted, so captions are never optional.
- **Layout (1080x1920).**
  - Captions at y ≈ 320.
  - The action between y ≈ 450 and 1400.
  - Bottom labels around y 1330.
  - The mascot at about (175, 1300).
  - The bottom ~300 px is covered by the platform UI.

## 3. Build it

```
cp -r template/ myfilm/ && bash scripts/fetch_fonts.sh myfilm
# myfilm/timeline.json: the voice-over's word timeline (voice-over skill: vo_align.py + vo_timeline.py),
# or a placeholder for timing: python3 scripts/tts_placeholder.py lines.txt --out-json myfilm/timeline.json
# write myfilm/world.js (start from the example), then:
node scripts/render.mjs myfilm/index.html stills/ --frames 30,240,520,850              # check stills
node scripts/render.mjs myfilm/index.html --probe "[CAM, telPos(T)]" --at 22.5,28.5    # debug positions
node scripts/render.mjs myfilm/index.html video.mp4                                    # full render, no audio
ffmpeg -i video.mp4 -i vo.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out.mp4
```

- **`template/toon.js` is the kit.** Change it only for a different look. It contains:
  - pen: `shape`, `stroke`, `arrowHead`, `burst`, `redX`
  - geometry: `rrect`, `circ`, `ell`, `hexPts`, `starPts`
  - `text`, `label`, `vgrad`, `starfield`, `mascot`
  - the timeline lookups `L` and `at(lineId, wordPrefix)`, and the captions
  - the camera: `camera`, `toScreen`, `CAM`
  - the engine: `startFilm(() => ({ camKeys, sky, world, overlay, shakes }))`
- **`template/world.js` is an example world** (a telescope folded in a rocket, launched, unfolding in space, 42 s). Keep its structure and replace the content:
  1. the world's constants (scale, positions)
  2. `keys()`: named moments from word times
  3. state functions: positions and deployment as pure functions of `t`
  4. `camKeys()`
  5. `drawWorld` (camera space) and `overlays` (screen space)
- **Camera keys are `[time, target, zoom]`.**
  - A target can be a function (`(t) => telPos(t)`), so the camera follows a moving object.
  - A zoom can be a function, e.g. fit the planet and the subject into one frame.
  - Between keys the zoom changes in log space. On a big zoom change the centre moves with 1/zoom, so the subject doesn't swing off screen.
- **`scripts/tts_placeholder.py`** (`pip install edge-tts`, ffmpeg) is only for timing before the real take exists. It writes the same `timeline.json` format as `vo_timeline.py`, so swapping in the real take re-times the whole film.
- **`scripts/render.mjs`** needs Playwright for Node (`npm i playwright` or a global install) and a Chromium (`npx playwright install chromium`, or `CHROME_PATH`). 42 s at 30 fps rendered in about 3 minutes on a CPU.

## 4. Check the stills before the full render

Render stills at every line change and at every word that triggers something, and look at them. When something is off screen, use `--probe` instead of guessing. Mistakes made while building the example:

- **A window cut into a two-part fairing filled itself.** Each half was drawn with the whole window as an even-odd hole, and the part of the hole outside a half's own shape got painted. Cut each half's own part of the hole.
- **A yellow rectangle at ignition.** A radial gradient's outer radius was smaller than its inner one (flame strength ≈ 0). Skip tiny values and keep the outer radius above the inner one.
- **The subject vanished in the far shot.** It was there, but smaller than a pixel (`--probe` showed its screen position). Mark it (rule 8).
- **The camera lost the subject after separation.** It still followed the rocket, which fell behind. Follow the subject from the moment it separates.
- **A comparison showed for half a second.** The ghost started folding back right after its word. Hold every comparison at least ~1 s after the word that names it, and keep the camera there until it is gone.
- **Labels in the caption area or on top of each other.** Two labels at the same y in one shot, or a label anchored above a subject that sat high in the frame. Check every label in the stills.
- **Objects too big or too small at a given zoom.** A sunshield as wide as the whole screen read as a wall; the subject at 20 % of the screen height read as a detail. Aim for the subject at 35-60 % of the frame in normal shots.

## Before sending

- One world, one camera: no cut, no crossfade, no object on an empty background. The subject is on screen, or marked, the whole time.
- Every comparison is a full-size ghost in the world and resolves into the real thing.
- Every reveal and label lands on its word and stays readable for at least ~1 s. Nothing sits in the caption area or under the bottom UI.
- Look at a contact sheet of the final file: `ffmpeg -i out.mp4 -vf "fps=0.75,scale=180:-1,tile=11x3" -frames:v 1 sheet.png`.
- Name the visual weak spots honestly if they are there:
  - a long stretch where the camera barely moves (in the example the first 14 s stay at the launch pad)
  - an ending that only holds on the subject instead of a last reveal (a final pull-back or a payoff image is stronger)
