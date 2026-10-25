---
name: toon-3d-animation
description: The look and animation of a vertical 3D cartoon video - big round white heads with drawn faces (thick brows, lidded eyes with a catchlight), hair in locks that never covers the eyes, bean-shaped shirts, rubber-hose limbs with curled feet, two-tone shading, even screen-space ink outlines, depth of field, glow on small lights, densely dressed sets, lively acting, quick cuts, one-word captions - and how to build it with the included three.js toolkit (characters with faces, poses, arm IK and constant "life"; gestures and faces timed to the words; a model sheet to check the cast; a phone held in two hands that types letter by letter, shot in first person; laptops and TVs with live screens showing real sites; timing driven by a voice-over timeline; frame-by-frame renderer). Covers only the visual design and animation, not the story or script. Use when the user wants a 3D cartoon / animated characters video, "in the same style" as an earlier toon video, cartoon characters instead of screen recordings, or asks how to make characters, a phone, screens or the camera look right in this style.
---

# Toon 3D animation

The visual style and the animation craft for short vertical videos with simple cartoon characters in 3D: a big round white head with a drawn face, hair in locks, a body made of clothing, smooth black arms and legs with ball hands and short curled feet, two-tone colours with even ink outlines, a shallow depth of field, densely dressed sets, quick cuts and big one-word captions. Everything here comes from building such videos with a user and from what they rejected on the way.

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
  - **Proportions:** the head is about 40% of the height (`headScale` 1.25). With a smaller head the characters read less cute and less expressive.
  - **Head:** a big, slightly squashed white sphere. Under warm or coloured light a white ball turns beige or grey, so heads get their own lift: `headLift(k)` per light rig, about 0.2 by day and 0.05 at night (then they take the night's colour). A brown "warm film" filter over the whole frame lost the white heads and was dropped.
  - **Face:** drawn parts on a canvas over the front of the head, so every expression is a set of numbers (`FACES`):
    - thick, short brows, always visible: they carry most of the acting;
    - black oval eyes, a little taller than wide, with a white catchlight (`EYES.tallDot`, the default). Other styles for other characters: `cute` (big, two dots) for kids, `small` for grumps, `big`, `tall`, `tall2`;
    - an upper lid line only when the eye is really half closed. A lid line on an open eye turns small eyes into a "T";
    - a small nose, a small mouth that opens on the voice.
    - Kinds: smile, happy, proud, sly, flat, grim, surprised, scared, angry, pain, sleep, shrug, awe, wistful, talk.
  - **Hair:** a mass of rounded locks with a fixed hairline well above the brows, so it never covers the eyes, from any camera height or head angle. Hair over the eyes "looks like a mistake".
    - Flat two-tone colour, no gloss: a smooth highlight band and soft shading read "too realistic, it shines".
    - Drawn lines in a darker shade of the hair colour (not black): the groove between locks, strokes up from the tips, one flat lighter stroke per lock.
    - No geometric add-ons on the head: a torus "bun" on top "doesn't fit the style".
    - Anything worn on the head (a bandage, a hat, a beret) sits outside the hair everywhere. A bandage smaller than the hair showed from behind as hair, an empty band, then hair again.
  - **Body:** a bean-shaped shirt (wider at the hem, rounded shoulders) with a collar, short sleeves, a placket line and an optional name badge (`tag`). Fabric is a basic cartoon texture: flat colour, a darker hem with a stitch line, side seams, a few drawn weave strokes.
  - **Limbs:** rubber-hose arms and legs: black tubes, straight-ish with the elbow and knee rounded (`BEND_ROUND` 0.5; 1 is one curve like a noodle, 0 a sharp corner, which looked stiff). Each leg curls forward into a short foot with a round toe; hands stay black balls.
- **One strong colour and one detail per character** (a name badge, a hat, a bandage, grey hair), so each reads instantly and stays the same in every shot.
- **Shading:** characters in two tones (light and one shadow, hard step); sets in a 3-step toon gradient; no tone mapping, so colours stay as picked.
- **Outlines:** drawn in screen space by `renderInk()`: every mesh gets an ID colour and a line goes wherever the ID changes, a constant width in pixels (`INK_PX`: about 5 px on a silhouette, 2.6 px where two touching things meet, at 1080 px wide).
  - This replaced inverted-hull outlines, which were as thick as a finger in close-ups, vanished in wide shots, made small far props into black blobs, and were hidden by anything in front (the bottom of a head against its own collar had no line).
  - The black limbs get no outline (they are lines already). Transparent meshes (the face decal, labels with alpha) are skipped, so draw an outline into their texture if they need one.
- **Colour and light:** a light rig per set (sun, sky and fill colours, fog for outdoors, a few point lights). Keep the palette saturated and varied: a teal wall behind a brown desk, a blue sky over a square, a strong shirt colour on the lead.
- **Depth** (`LOOK`, applied by `present()`):
  - **Depth of field** (`LOOK.dof`): sharp at the look point of `shotCam`, blurring in front and behind. It separates the character from a busy set in the narrow vertical frame. When the subject is an object (a counter, a sign), set `FOCUS.at = obj.getWorldPosition(V(0, 0, 0))` before `shotCam`, or the number ends up blurred.
  - **Glow** (`LOOK.bloom`): only on meshes marked `glowy()`: small lights such as lamps, a candle flame, LED digits, a moon. Never a whole window or a white wall: its halo bleeds over the silhouettes in front of it.
- **Sets:** rounded boxes, cylinders and spheres in saturated flat colours, densely dressed.
  - A living room: plank floor, striped wall, a window with curtains, a sofa, an armchair, a rug, a plant, pictures, a lamp.
  - An office: blue carpet, ceiling panels, red cubicle walls, desks, a meeting table, a TV.
  - Never empty: a set with nothing behind the characters looked "poor", and a bare wall still looked cheap next to good characters. Dress every wall (shelves, pictures, tools, plans, a window), every surface (papers, jars, small objects) and the floor (crates, barrels, a rug); outdoors add stalls with striped awnings, carts, banners, lamps. With the depth of field the background dressing reads as texture, not clutter.
  - `template/props.js` has builders for this, all in the same style (outlines, two-tone, glow): `shelf` (books of varied height, a plant; `levels` for a bookcase), `plant`, `lamp` (floor or table, its bulb glows and lights the set), `windowWithCurtains`, `picture`, `wallClock`, `coffeeTable` (a mug, magazines, a bowl), `sideTable` (a lamp, a book), `rug`, `cushions`, `crate`, `barrel`, and outdoors `stall` and `pennants`. The example living room uses ten of them; build project-specific props the same way.
  - Keep big patterns quiet: a rug with wide high-contrast stripes shouted over the characters.
- **Captions:** one word at a time, white Inter Black with a thick black outline, a small pop when the word appears, in the lower third, and lower still when they would cover a screen.
- **Rendering:** 1.5x supersampled and downscaled, with soft shadows from one sun.

## 2. Make them alive

The first cut was "not dynamic, the characters should feel alive". What fixed it:

- **`life(c, t, seed, pose)` on every pose, in every shot:** breathing (the body scales slightly), sway, small head turns, arm drift. Nobody is ever frozen, not even in the background.
- **Blinks and talking:** use `faceAt(kind, t, seed, mouth(t, ['line ids']))`. A character who narrates talks to the camera and their mouth opens on the voice's words. A blink has a half-closed frame before and after it.
- **Faces:** change the face on the beat the emotion changes (the kinds are listed in section 1).
- **Timing to the voice** (`keyed`, `faceKeys`; from studying popular shorts in this style frame by frame):
  - **A gesture lands just before its word:** it takes about 5 frames and is finished 4 frames before the word (`LEAD`), with a small overshoot, so the pose is there when the word is heard. A gesture that starts on its word looks late, like a key tap that starts on its letter.
  - **The head follows the body** 3 frames later (`HEAD_LAG`): follow-through instead of a robotic snap.
  - **A face never morphs into the next one:** it swaps through a blink (half closed, closed) and the new face is there 2 frames before the stressed word.
  - Use them as `c.pose(life(c, t, seed, keyed([[0, poseA], [T('l1:word'), poseB]], t)))` and `c.face(faceKeys([[0, 'flat'], [T('l1:word'), 'surprised']], t, seed))`. `keyed` poses blend joint angles, so a hand on an IK `target` (a phone, a lever) is set after it, as before.
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

1. `scripts/setup.sh <dir>` copies the template (`index.html`, `toon.js`, `props.js`, an example `story.js`, an example `timeline.json`, the model sheet `sheet.html` + `sheet.js`) and downloads three.js r170 and the Inter font.
2. Replace `timeline.json` with your voice-over's timeline:

   ```
   {"duration": s, "lines": [{"id", "words": [{"w", "t0", "t1"}]}]}
   ```

   The `voice-over` skill's `vo_timeline.py` writes this format. Keep the take uncut: the picture follows the voice.
3. **Check the cast on a model sheet before building scenes:** put the cast and their expressions in `CAST` in `sheet.js`, then `node scripts/render.mjs <dir>/sheet.html <dir>/sheet --fps 1 --frames 0,1,2,3,4,5,6,7`: front, three-quarter, from above, from behind, a bend test from the side and the front, two face close-ups. Iterate on looks here (seconds per round) rather than on full renders (half an hour). Look for:
   - hair over the eyes from above, or a gap in the hair from behind;
   - anything worn on the head poking through the hair or hidden in it;
   - missing outlines (head against collar, hair against forehead);
   - elbows and knees: rounded, not broken; feet on the floor.
4. In `story.js` build the set, the cast and `shot(t)`, one `if` branch per shot, cut on words.
5. **Check stills before rendering:** `node scripts/render.mjs <dir>/index.html <dir>/stills --fps 24 --frames 36,120,…`, one or two frames per shot, then look at a contact sheet. Problems that came up every time:
   - the camera inside a head;
   - a character sitting inside a table, standing off-frame or facing away;
   - hair over the eyes;
   - a prop at the wrong scale;
   - a hand hiding the screen;
   - the big head cut by the frame edge (frame a little wider than feels natural);
   - the subject or the number object out of focus.
6. Render: `node scripts/render.mjs <dir>/index.html out.mp4 --fps 24`.
   - Each frame is rendered four times (colour, IDs for the ink, depth of field, glow): about 3 s per frame on 4 CPU cores with software WebGL, so a 22 s video at 30 fps took about half an hour.
   - For faster drafts set `LOOK.dof = LOOK.bloom = false` or lower `SS` in `toon.js`.
7. Effects that follow the animation:
   - `scripts/word_cues.py timeline.json spec.json cues.json` for a whoosh on cuts, a thud on impacts, a pop on reveals and typing ticks;
   - then `sound-design`'s `sfx_stems.py` and `mix.py --video`.
8. Before sending, check:
   - Every character moves in every frame, and nobody stands frozen in the background.
   - Gestures land just before their words, and faces change through a blink.
   - Hair never covers the eyes; heads stay white by day; outlines are there and even in every shot.
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
