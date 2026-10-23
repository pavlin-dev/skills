---
name: toon-3d-animation
description: The look and animation of a vertical 3D cartoon video - round white heads with drawn faces, stick limbs with ball hands, flat colours, bold black outlines, simple rooms, lively acting, quick cuts, one-word captions - and how to build it with the included three.js toolkit (characters with faces, poses, arm IK and constant "life"; a phone held in two hands that types letter by letter, shot in first person; laptops and TVs with live screens showing real sites; timing driven by a voice-over timeline; frame-by-frame renderer). Covers only the visual design and animation, not the story or script. Use when the user wants a 3D cartoon / animated characters video, "in the same style" as an earlier toon video, cartoon characters instead of screen recordings, or asks how to make characters, a phone, screens or the camera look right in this style.
---

# Toon 3D animation

The visual style and the animation craft for short vertical videos with simple cartoon characters in 3D: a big round white head with a drawn face, a body made of clothing, stick arms and legs with ball hands and feet, flat colours with bold black outlines, simple rooms, quick cuts and big one-word captions. Everything here comes from building such videos with a user and from what they rejected on the way.

This skill is only about how it looks and moves. Get the story and the script from other skills (for a product video, `marketing-storytelling-video`), the voice from `voice-over`, and the mix from `sound-design`.

## Why this look (what was tried first)

| Tried | Verdict |
|---|---|
| AI image-to-video (local LTX) with real screens keyed in | "you can tell it's AI-generated, and that's bad": faces and logos change between shots, hands go wrong |
| Rigged realistic humans (MakeHuman, Mixamo) | weeks of fixing hands, elbows and grips, still uncanny |
| Paper puppets, clay | "looks low quality by mistake" |
| Objects only, no people | liked, see the variant at the end |
| **Round-head cartoon characters** | chosen, once they were made *alive* and the phone handling looked physical |

It works because it is deliberately simple: no fingers, no anatomy, no uncanny faces. Everything is code, so a render is deterministic and every frame can be checked.

## 1. The look

- **Characters** (`makeChar` in `template/toon.js`):
  - **Head:** a big, slightly squashed white sphere with an outline.
  - **Face:** drawn in thick black lines on a canvas over the front of the head: dot or arc eyes, one-line mouth, brows only for emotion.
  - **Hair:** a coloured cap. Young characters have a fringe kept off the eyes; older ones have grey hair, receding at the top.
  - **Body:** a short tapered cylinder in a single shirt colour.
  - **Limbs:** black sticks with ball hands and feet.
- **One strong colour and one detail per character** (glasses, scarf, bun, grey hair), so each reads instantly and stays the same in every shot.
- **Materials:** flat toon shading (a 3-step gradient), no tone mapping, so colours stay as picked. Outlines are inverted hulls about 1 cm thick at character scale, and a fill light keeps faces turned from the sun white.
- **Sets:** 10-20 rounded boxes, cylinders and spheres in saturated flat colours.
  - A living room: plank floor, striped wall, a window with curtains, a sofa, an armchair, a rug, a plant, pictures, a lamp.
  - An office: blue carpet, ceiling panels, red cubicle walls, desks, a meeting table, a TV.
  - Simple, but never empty: a set with nothing behind the characters looked "poor".
- **Captions:** one word at a time, white Inter Black with a thick black outline, a small pop when the word appears, in the lower third, and lower still when they would cover a screen.
- **Rendering:** 1.5x supersampled and downscaled, with soft shadows from one sun.

## 2. Make them alive

The first cut was "not dynamic, the characters should feel alive". What fixed it:

- **`life(c, t, seed, pose)` on every pose, in every shot:** breathing (the body scales slightly), sway, small head turns, arm drift. Nobody is ever frozen, not even in the background.
- **Blinks and talking:** use `faceAt(kind, t, seed, mouth(t, ['line ids']))`. A character who narrates talks to the camera and their mouth opens on the voice's words.
- **Faces:** smile, happy, sly, wistful, pain (with a sweat drop), awe, surprised, shrug, flat, talk. Change the face on the beat the emotion changes.
- **Exaggerated acting:**
  - anticipation before a move (lean back, then stand);
  - overshoot (`back()`);
  - trembling legs when straining;
  - `squash()` of the head on impacts and surprises;
  - a raised finger on the key word;
  - a shrug with a little hop;
  - a slow jaw drop and a hand reaching out in awe;
  - dancing with arms up on the beat.
- **Effects that sell an action:** red crack lines at the knees, sparkles, music notes, a speech bubble with a pictogram that pops in with overshoot.
- **Camera:** handheld drift (`shotCam`), a punch-in on the key word (`fov - 6 * punch(t, T('line:word'))`), a shake on impacts (`kick`), and one slow push or orbit per shot.
- **Editing:** a cut or a clear change every 1.5-3 s, each landing on a word of the voice (`T('p1:laggy')`). A shot with nothing new for 3 s feels dead.

## 3. A phone in their hands

"The handling of the phone is weak" until it was done like this (`holdPhone`, `typed`, `phoneCloseUp`):

- **The phone faces the character.** It sits in front of the chest, turned to the face and tilted up to the eyes, and both hands grip its long sides (arm IK), elbows out and down. With `oneHand` the free hand can gesture. A phone whose screen faces the camera reads as "he holds it the wrong way round and shows it to you".
- **No fingers.** Drawn thumbs flying over the keys didn't look good. Instead:
  - an on-screen keyboard is drawn, and for each letter from `typed(str, t0, t1, t)` the key lights up with a pop-up bubble;
  - the hand on that key's side taps it: it starts down 0.07 s *before* the letter appears, lands exactly on it, and springs back, while the phone dips a touch. A tap that starts on the letter looks late;
  - when the typing ends, the hands just hold the phone. Idle tapping looked like delayed typing.
- **Close-up in first person:** with `phoneCloseUp(phone, character, t)` the camera is the character's eyes looking down at the phone in their own hands. The head is hidden for that shot, the arms come in from the bottom of the frame, and the screen reads upright. Over the shoulder was tried: the big round head covers half the frame.
- **Never a phone floating on a coloured background.**
- **The screen content:**
  - Typed text goes letter by letter into the real input box with a caret.
  - The typing sound is one tick per letter on the same times (`scripts/word_cues.py`).

## 4. Laptops, TVs and real screens

- `makeLaptop` and `makeTV` get a live canvas, drawn every frame: a real page, an animation, a chat.
- Take real pages with `scripts/shoot_site.mjs`:
  - `--mobile` for a phone (780x1688 px), `--desktop` for a laptop or TV (1920x1200 px);
  - `--type "<selector>" "<text>"` prints the input's box, so you can draw your own letters into it;
  - `--drag "<selector>"` shoots a drop zone in its file-hover state;
  - `--nojs` is for pages whose scripts fail headless (you'll see an error page). Remove any leftover loading overlay from that HTML.
- Draw other things on screens in the same flat style. Animate what changes (a file card dragged in, a notification sliding down, a highlight), and punch the camera in so the screen is readable for at least ~1.5 s.
- A contrast pair reads instantly on a TV, e.g. a blurry, choppy "screen recording" with a cursor, a REC badge and a notification, then the crisp version.

## 5. Build and render

1. `scripts/setup.sh <dir>` copies the template (`index.html`, `toon.js`, an example `story.js`, an example `timeline.json`) and downloads three.js r170 and the Inter font.
2. Replace `timeline.json` with your voice-over's timeline:

   ```
   {"duration": s, "lines": [{"id", "words": [{"w", "t0", "t1"}]}]}
   ```

   The `voice-over` skill's `vo_timeline.py` writes this format. Keep the take uncut: the picture follows the voice.
3. In `story.js` build the set, the cast and `shot(t)`, one `if` branch per shot, cut on words.
4. **Check stills before rendering:** `node scripts/render.mjs <dir>/index.html <dir>/stills --fps 24 --frames 36,120,…`, one or two frames per shot, then look at a contact sheet. Problems that came up every time:
   - the camera inside a head;
   - a character sitting inside a table, standing off-frame or facing away;
   - hair over the eyes;
   - a prop at the wrong scale;
   - a hand hiding the screen.
5. Render: `node scripts/render.mjs <dir>/index.html out.mp4 --fps 24`.
   - It takes about 6-9 min for 28 s on 4 CPU cores with software WebGL, and about 2 min for the 9 s example.
   - Add `?ss=1` to the page URL for faster drafts.
6. Effects that follow the animation:
   - `scripts/word_cues.py timeline.json spec.json cues.json` for a whoosh on cuts, a thud on impacts, a pop on reveals and typing ticks;
   - then `sound-design`'s `sfx_stems.py` and `mix.py --video`.
7. Before sending, check:
   - Every character moves in every frame, and nobody stands frozen in the background.
   - Hands are on devices, each key tap lands on its letter, and the phone screen faces its user.
   - Screens are readable when they matter.
   - Captions don't cover a screen or a face.
   - A 2 fps contact sheet of the final file looks right: `ffmpeg -i out.mp4 -vf "fps=2,scale=120:-1,tile=19x3" -frames:v 1 sheet.png`.

## Variant: objects instead of characters

Also liked: no people at all, one continuous camera gliding over a desk where objects tell the story. Examples:
- a tear-off calendar page;
- a phone buzzing with a 3D "!" popping out;
- a flip clock turning to 00:00;
- a miniature shop sign flipping to "CLOSED";
- a pencil writing in handwriting (Caveat font) and snapping;
- words jumping out of a phone screen as 3D text;
- hearts flying out at the end.

Build it with the same toolkit (`obj`, `toon`, `RB`, `shotCam`, a phone screen, the timeline). Fill the scene: real CC0 props and an HDRI from Poly Haven (polyhaven.com, glTF via its public API) turned an "empty, poor" set into a lived-in room. Characters carry emotion better; objects suit a strong object metaphor.
