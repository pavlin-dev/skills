---
name: motion-design-video
description: How to make a motion-design promo video (vertical 1080×1920 Reels/Shorts/TikTok, also for Reddit/X feeds) in Remotion where everything flows into everything — one shared 3D camera, vector shapes that grow and morph into the next scene, kinetic typography, no plain cuts. Use when the user asks for "motion animation", "motion design", "motion graphics", animated explainer/promo without much real footage, or says a video looks like slides with transitions, is not connected enough, or is boring.
---

# Motion-design promo video

The goal is one continuous piece of animation: the viewer never sees a "next slide". Every scene is born out of an element of the previous one (a highlight grows into a page, an icon blooms into the background, a card folds into a search bar), and one slowly moving 3D camera holds it all together. This skill builds on the `engaging-video` skill in this repository (beat sync, music, rendering, sound design); read that one for tooling, this one for the style.

## Principles (each came from user feedback)

1. **Find a motion that *is* the product.** Before designing scenes, ask: what does the product do, and how can that become movement? For a Czech rhyme finder the core image was "the ending of the word stays, only the start changes" (k|očka → vl|očka → č|očka), shown as a 3D reel turning in front of a fixed ending. Generic page flips between nice layouts read as a slideshow, however good the 3D is.
2. **4–6 parts, 15–20 s, one idea per part.** One continuous screen with a single element that only changes is boring; ten scenes are chaos. A good arc: hook question → the product's core mechanic → what you get out of it → the community/second feature → CTA.
3. **Every transition is a morph of a vector element.** Pick one element of the outgoing scene and let it become the next scene:
   - a highlight/rectangle grows to full screen and becomes the next page's background (radius → 0, opacity → 1),
   - an icon (snowflake, star, logo mark) draws itself, then blooms (scale ×10, rotates) while a circle of the next background colour opens from its centre,
   - a button grows into a full-screen circle (iris) in the next colour,
   - a stack of cards folds into one card whose rectangle interpolates into the CTA's search bar / URL pill,
   - one element splits into several (a single word ending becomes five copies that slide into a list),
   - words fly from one layout into another (list rows glide into the lines of a poem) while the rest sinks into depth.
   Each part gets its own background colour (cream → red → cream → ink), so the morph is obvious.
4. **One camera for everything.** All layers, including UI (search bar, buttons, captions), sit under the same slow 3D camera (rotateX/rotateY of a few degrees, keyframed per part, eased in-out). A flat UI element on top of a tilting scene looks pasted on. The background shapes get a small parallax from the same camera values.
5. **No pulsing on every beat.** Scaling the whole frame on each beat was "too much". Use the beat for *events* (a reel click, a card landing, a word flip), not for a global throb.
6. **Vector decor that lives.** A few simple shapes per part: outline rings, dots, a squiggle that draws itself (stroke-dash), sparkles that pop at line ends, a hand-drawn underline under the key word. They appear with a pop or a draw, drift slowly, and shrink away when the part ends. 2–3 per part, never in the text area.
7. **Kinetic type over static captions.** One caption per part, max ~6 words, flip-board change (old flips out at the bottom, new flaps in from the top, 6–8 frames gap so they never overlap). Key words in the brand colour.
8. **Frame 0 readable, CTA held 3–4 s.** The hook question and the hero are on screen at frame 0. End with logo/URL, one promise, one button; cut the video so the CTA stands 3–4 s, not longer.
9. **Claims come from the live site.** Every number or feature on screen is checked on the product's website. Cards/feeds/UI shown as abstract vector shapes are fine, but say which parts are illustrations.

## Workflow

1. **Research the product**: open the site, use the product once, note real data you can show (search results, counts, slogans). Screenshots help for colours and tone.
2. **Ask for music first.** The best results came from a track the user picked; you cannot listen, and every guess from free catalogs was rejected ("too old-fashioned", "too generic", "sounds like a kids' game"). If they have none, see the music section of `engaging-video` and offer two variants. Never synthesize the music in code, not even as a placeholder: use an existing track or a music generator; only short sound effects may be synthesized.
3. **Measure the music** (`engaging-video` skill: `scripts/beats.py`, `scripts/section.py`) and look at energy per bar. If the track has a lift/drop, start the excerpt so the lift lands on the biggest transition (e.g. the bloom into part 4).
4. **Write the storyboard in beats** and show it to the user:

   | beats | part | hero / connecting element | transition out (vector morph) |
   |---|---|---|---|
   | 0–6 | hook: question + product mechanic | hero word on a 3D reel | reel unrolls into a list |
   | 6–10 | core mechanic explained | list + highlight bar | highlight grows into a red page |
   | 10–16 | what you get | words fly into a poem, underline, icon draws | icon blooms, cream circle opens |
   | 16–25 | second feature / community | cards fly from depth, heart pops | cards fold into the search bar, ink circle |
   | 25–34 | CTA | bar shows the URL, slogan from depth, button + ripples | — (hold 3–4 s) |

5. **Build** in Remotion with the patterns in `references/patterns.md` (shared camera layers, reel, shape→page morph, bloom, card→bar morph, stroke drawing, measured text anchors). Drive everything from beats.
6. **Check stills, not just the code**: `scripts/sheet.sh` renders chosen frames of a bundle into one contact sheet. Look at frame 0, the middle of every morph, every caption change and the CTA.
7. **Sound**: one effect per visible event (click on a reel step, whoosh on a morph, thud when something lands, ding on the CTA), mixed with `scripts/sfx_mix.py` (cue list in beats, music gain, loudnorm to −14 LUFS).
8. **Render** with `engaging-video`'s `scripts/render.sh` or `npx remotion render`, mux the mix, then make a 2 fps contact sheet of the final file (`ffmpeg -i out.mp4 -vf "fps=2,scale=160:-1,tile=19x2" -frames:v 1 sheet.png`) and check it.

## Before sending

- Frame 0 says what it is; nothing important below y ≈ 1570 or above y ≈ 130.
- Every part change is a visible morph of an element; no cut, no plain fade, no slide change.
- All layers (UI included) tilt with the same camera; nothing looks pasted on.
- No global beat pulse; events land on beats.
- Mid-morph frames are not a mess (e.g. many overlapping copies, a caption flipping over another).
- CTA stands 3–4 s; total length as planned; audio peaks below −1 dBFS, ≈ −14 LUFS.
- Claims verified; illustrations named; music source and licence told to the user (you can't listen, say so).
