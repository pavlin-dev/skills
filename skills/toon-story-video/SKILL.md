---
name: toon-story-video
description: How to make a vertical marketing story video (Shorts, Reels, TikTok) as a 3D cartoon - round white heads with drawn faces, stick limbs, flat colours, bold outlines, quick cuts - where characters act out a short story and the real product appears on a phone, laptop or TV in the scene. Includes a three.js toolkit (characters with faces, poses, arm IK and constant "life"; a phone held in two hands, typing letter by letter with a hand tap per key; laptops and TVs with live screens; voice-driven timing and captions), a one-take voice script, real-site screenshots and a renderer. Use when the user wants a cartoon / animated / 3D story video, characters instead of screen recordings, "something like those cartoon shorts", a more engaging version of a screen-and-captions video, or asks for another video "in the same style" as an earlier toon story.
---

# Toon story video

A 25-30 s vertical video in which simple cartoon characters act out a small story, and the product shows up as a real screen inside that story. Everything here comes from making such videos with a user, for a rhyme finder, a worship-song library, a VR world builder and a video exporter, and from what they rejected on the way.

Decide the story first with the `marketing-storytelling-video` skill (the hero is the user, the product is the tool, no end card). This skill is the execution. Mix the sound with the `sound-design` skill.

## Why this style (what was tried first)

| Tried | Verdict |
|---|---|
| Screens + captions + voice only | "not engaging enough, people skip it" |
| AI image-to-video (local LTX) with the real screen keyed in | "you can tell it's AI-generated, and that's bad": faces and logos change between shots, hands go wrong |
| Rigged realistic humans (MakeHuman, Mixamo) | weeks of fixing hands, elbows and grips; still uncanny |
| Paper puppets, clay | "looks low quality by mistake" |
| Objects only, no people (a desk where things tell the story) | liked ("skvělé"), see the variant at the end |
| **Round-head cartoon characters (this skill)** | chosen; after making them *alive* and the phone handling real |

The style works because it is deliberately simple: no fingers, no anatomy, no uncanny faces. Everything is code, so a render is deterministic and every frame can be checked.

## 1. Story and script

- Follow `marketing-storytelling-video`. Two rules the user enforced again here:
  - **Don't name the product in the voice-over.** "Tak jsem to zkusil na Chvalotce… a byla tam, i s akordy" felt like an ad. The product is only *seen*: its real page on a screen, its address in the browser bar. The link goes in the post text.
  - **End on a joke about the people**, never on a product panel, logo or URL. "Dan now says he exported it himself." / "So that's next Sunday's sentence."
- Make a person the hero, not the app: "There's one person at every youth night who can find any song. Ours is Ondra."
- **The plot must fit the product's real limits** (time it takes, login, what it outputs). Check every claim on the live site.
- 60-75 words, 8-10 short lines, about 25-30 s. Language of the product's audience (English for an English site).
- Plan **a cut every 1.5-3 s**, each tied to a word. A shot with nothing new for 3 s feels dead.

## 2. Voice: one take, never cut

- Generate the whole script in **one request** so it sounds like one performance: `scripts/tts_take.py script.txt vo/take en-US-AndrewNeural "+2%"`. It writes `take.wav` and `take.json` (word times from the TTS engine).
- **Never split the take into lines and re-time them to the picture.** On review the voice "sometimes breaks in the middle… that must not happen; the voice must be natural". The picture follows the voice, not the other way round.
- Add comic pauses only inside existing silence: `scripts/pauses.py take.wav take.json vo 0.2 1.3 "p2:start=0.35" "e1:start=0.5"`. It prints how quiet each splice is (it should be around -90 dB or quieter).
- `edge-tts` is a placeholder: it uses an unofficial endpoint, and you shouldn't publish an ad with it. For the final cut use a real voice, the `voice-over` skill (Gemini TTS), or an official TTS API. Tell the user which one you used.

## 3. Real product screens

- Shoot the real site with `scripts/shoot_site.mjs`. Use `--mobile` for a phone and `--desktop` for a laptop or TV.
  - `--type "textarea" "your sentence"` types into the real input and prints its box.
  - `--drag "<drop zone selector>"` shoots the drag-over state.
  - `--nojs` is for pages whose JS chunks fail to load headless (you'll see an error page). Remove any leftover loading overlay in the page if one stays.
- In the scene, draw the screenshot on the screen canvas and type **your text into the real input box yourself, letter by letter** (`typed()`), with a caret. Keep the real UI around it.
- What's shown must be real behaviour: real search results, real page. Your own content (the character's animation, chat, lock screen) can be invented but generic.
- A not-logged-in page shows "Sign in to build"-type buttons. Mention it to the user, or shoot a logged-in page if they give access.

## 4. Characters that feel alive

The first cut was "not dynamic, the characters should feel alive". What fixed it, all in `template/toon.js`:

- **`life(c, t, seed, pose)` on every pose, every shot:** breathing (body scale), sway, small head turns, arm drift. Nobody is ever frozen.
- **Blinks and talking:** use `faceAt(kind, t, seed, mouth(t, ['line ids']))`. The narrator talks to the camera and their mouth opens on the voice's words.
- **Acting, exaggerated:**
  - anticipation before a move (lean back, then stand);
  - overshoot (`back()`);
  - trembling legs;
  - `squash()` of the head on impacts and surprises;
  - a finger raised on "one sentence";
  - a shrug with a hop;
  - a slow jaw drop and a hand reaching out in awe.
- **Camera:** handheld drift (`shotCam`), a punch-in on the key word (`fov - 6 * punch(t, T('d1:4k'))`), a shake on impacts (`kick`), and one slow push or orbit per shot.
- **Faces:** smile, happy, sly, wistful, pain, awe, surprised, shrug, flat, talk. Pain adds a sweat drop; pair it with red "crack" marks on the knees.
- **Cast:** give each character one strong colour (shirt) and one detail (glasses, scarf, bun, grey hair), so they read instantly and stay the same in every shot.

## 5. Handling a phone (and screens)

"The handling of the phone is weak" until it was done like this:

- **`holdPhone(c, phone, pose, t, typing)`:** the phone sits in front of the chest and both hands grip its long sides (arm IK), elbows out and down. With `oneHand` the free hand can gesture.
- **No fingers.** Drawn thumbs flying over the keys "didn't look good". Instead an on-screen keyboard is drawn, and for each letter from `typed(str, t0, t1, t)` the key lights up with a pop-up bubble. Meanwhile the hand on that key's side gives a small tap (in and down onto the glass, then back) and the phone dips a touch. Typing sounds are one tick per letter on the same times (`scripts/word_cues.py`).
- **The screen faces the character, not the camera.** The phone is turned to their face and tilted up to the eyes. A close-up taken from in front of the character (camera on the screen's normal, character behind the phone) read as "he holds the phone the wrong way round and shows it to you".
- **Close-up over the shoulder with `phoneCloseUp(phone, character, t)`:** the camera sits behind and above the right shoulder, rolled toward the phone's up so the screen reads upright. The edge of the head and the hand stay in frame, as if we were looking over their shoulder. Move the captions off the keyboard for that shot. Never show a phone floating on a coloured background.
- Laptops and TVs (`makeLaptop`, `makeTV`) get a live canvas: the real page, or the character's own content. A contrast pair works well, e.g. a blurry, choppy "screen recording" with a cursor and a notification vs the crisp export.

## 6. Build and render

1. Start the project: `scripts/setup.sh <dir>`. It copies the template (`index.html`, `toon.js`, `story.js`, example `timeline.json`) and downloads three.js r170 and the Inter font into it.
2. Put your voice timeline in the project as `timeline.json` (from `tts_take.py` / `pauses.py`). In `story.js`, `T('p1:laggy')` is when that word starts.
3. Write the set (rooms are 10-20 `obj()` boxes, cylinders and spheres with flat `toon()` colours: floor, walls, a window, a sofa or desks, a rug, a plant, pictures), the cast, and `shot(t)`: one `if` branch per shot, cut on words.
4. **Check stills before rendering:** `node scripts/render.mjs <dir>/index.html <dir>/stills --fps 24 --frames 36,120,…`, one or two frames per shot, then look at a contact sheet. Bugs that came up every time:
   - the camera inside a head;
   - a character sitting inside a table or standing off-frame;
   - a character facing away from the camera;
   - hair over the eyes;
   - a prop at the wrong scale.
5. Render: `node scripts/render.mjs <dir>/index.html out.mp4 --fps 24`. That took about 6-9 min for 28 s on 4 CPU cores with software WebGL, and about 2 min for the 9 s example. Add `?ss=1` to the page URL for faster drafts (the default 1.5x supersampling smooths outlines).
6. Sound:
   - `scripts/word_cues.py timeline.json spec.json cues.json` for the effects (a whoosh on cuts, a thud on impacts, a pop on reveals, a ding on the turn, per-letter typing ticks);
   - then the `sound-design` skill's `sfx_stems.py` and `mix.py --video`.
   - Music: an existing licensed track, never synthesized. Kevin MacLeod's "Wholesome" and "Carefree" (incompetech.com, CC BY 4.0) worked; credit the author in the post.
7. Look at a 2 fps contact sheet of the final file before sending: `ffmpeg -i out.mp4 -vf "fps=2,scale=120:-1,tile=19x3" -frames:v 1 sheet.png`. You can't listen to the mix, so say so.

## 7. Before sending

- Hook in the first 2 s: a character and a problem, readable without sound (one-word captions are on).
- A cut or a clear change every 1.5-3 s; every character moves in every frame.
- The product appears only on screens, real and readable for at least ~1.5 s (punch in on it). The voice-over never names it, and there's no end card.
- Phone and laptop handling looks physical: hands on the device, a tap on each key that lights up.
- Voice is one uncut take; captions match it word for word.
- Claims checked on the live site; music credit and the voice's licence status told to the user.
- Tell the user honestly what's weak (simplified walk cycle, mouth timing rather than lip-sync, any not-logged-in UI).

## Variant: objects instead of characters

Also liked: one continuous camera over a desk at night where objects tell the story, with no people at all:
- a tear-off calendar page revealing the date;
- a phone buzzing with a reminder and a 3D "!" popping out;
- a flip clock turning to 00:00;
- a miniature shop's sign flipping to "CLOSED";
- a pencil writing the poem in handwriting (Caveat font) and snapping on the dead end;
- the real product on the phone, with result words jumping out of the screen as 3D text;
- hearts flying out of the phone at the end.

Build it with the same toolkit (`obj`, `toon`, `RB`, `shotCam`, phone screen, timeline), with the camera gliding from object to object. Make the scene rich: real CC0 props and an HDRI from Poly Haven (polyhaven.com, glTF via its public API) turned an "empty, poor" set into a lived-in room. It suits products with a strong object metaphor. Characters carry emotion better.
