---
name: engaging-video
description: How to make short, engaging vertical promo videos (Reels/Shorts/TikTok, 1080×1920) in Remotion: clean 2D layouts with 3D transitions (2.5D motion design), real product footage, and music synced to the beat (the user's own track, Suno or free sources). Two styles: clean 2D layouts with 3D transitions, and motion design where vector shapes morph into the next scene under one shared 3D camera (details in the `motion-design-video` skill). Use whenever the user asks for a promo video, short, reel, teaser, product demo video or "motion" animation, or says a video is boring, unclear or needs music.
---

# Engaging short videos

A short video has about one second to tell the viewer what it is about, and about one second per idea after that. Every frame has to either explain the product or carry the viewer to the next frame. A slideshow of nice stills is boring, no matter how good the stills are.

## What makes it engaging (learned the hard way)

1. **Say what it is in the very first frame.** Frame 0 must already show the category and the promise ("ONE SENTENCE → VR GAME", "Build a **VR** padel court…"). Never let text fade in from nothing at t=0: start entrance animations at negative time so frame 0 is readable. If the product is VR, AI, a game, etc., that word has to be on screen and visually emphasized immediately.
2. **Find the motion that *is* the product.** Ask what the product does and turn exactly that into movement (a rhyme finder: the word's ending stays put while its start spins on a reel). That one image carries the hook; generic flips between nice layouts read as a slideshow.
3. **One subject.** One product or one demo per video (e.g. only the Padel Pro example), not a tour of features. 15-25 s is the target. Ask the user for the length if unsure, default 20 s.
4. **Connect the scenes, but not with a gimmick.** The viewer must feel one continuous piece, not a slideshow. The most reliable way is one hero element that survives every cut: the same phone flips to show the next screen, the scene turns like a cube, a card falls back into a floor, the screen swings open like a door (see the two styles below). A travelling object (ball, mascot, cursor) that hops on words and dives into the lens can also work, but users have called a bouncing dot/mascot distracting and a free-flying 3D camera "too chaotic". Use such a motif only when the subject itself is a physical object (a ball in a sports game), never as a default.
5. **No plain cuts.** Each scene change is motivated by motion: a 3D flip/turn/fold of the current layout, zoom-through, whip-pan push, match cut on the same shape. Keep elements alive across the cut (the link pill morphs into the CTA URL bar, the phone flips instead of disappearing).
6. **Everything on the beat, but no global pulse.** Pick music with a clear, steady kick, measure its exact BPM and phase, and put every landing, cut, word reveal and flash on a beat. Don't scale the whole frame on every beat: users called it "too much". Use bars as the unit of scene length (at 120 BPM, 1 bar = 2 s).
7. **Show the real product.** Use actual footage of the product. Clean, full-bleed vertical footage beats upscaled screen recordings in a card. Avoid footage with baked-in captions.
8. **Text is short and for the viewer.** Max ~4 words per caption, one caption per scene, big (100-150 px Geist ExtraBold), with a brand-colored period. Write for the viewer, not about the tech; if a copywriting skill is available, follow it. Take claims (free credits, devices) from the product's own website, never invent them.
9. **Moments of contrast.** One slow-motion beat (with the music low-passed and ducked) or one breakdown makes the rest feel faster. Add a punch: flash + shockwave + racket/impact sound on the key hit.
10. **Sound design is half of it.** Add a sound for every visible motion: bounce "pocks", whooshes on transitions, a hit/boom on impacts, a click on buttons, a ding on score/CTA. Synthesize them (numpy), keep them ~10 dB under the music, loudnorm the final mix to −14 LUFS.
11. **End with a clear CTA**: logo, one question or promise, a button ("Start for free"), the URL. Hold it for 3-4 s, not longer; cut the video there.
12. **Vertical 1080×1920 by default**, also when the video is meant for Reddit or another feed, unless the user asks for another format.

## Style A: motion design, vector morphs under one camera

The style users liked most for products without much footage. Full guide, workflow and code: the `motion-design-video` skill (`skills/motion-design-video/` in this repository). The core rules:

- **One continuous piece, 4-6 parts, 15-20 s.** Every part is born out of an element of the previous one: a highlight grows into the next page, an icon draws itself and blooms into the next background, a button grows into a full-screen circle, a stack of cards folds into the CTA's URL bar, one word splits into a list. Each part has its own background colour, so the morph reads.
- **One shared 3D camera** (a few degrees of rotateX/rotateY, new direction per part) over *all* layers, UI included. A flat search bar on top of a tilting scene looked pasted on.
- **Vector decor**: rings, dots, squiggles and underlines that draw themselves (stroke-dash), sparkles that pop; 2-3 per part, gone when the part ends.
- **Kinetic type**: one flip-board caption per part, key words in the brand colour.
- **Events on beats, no global pulse.**

## Style B: clean 2D layouts with 3D transitions (2.5D)

Good when there is real product footage or screenshots to show. Each scene is a tidy, flat 2D layout; depth appears only while moving from one scene to the next and in small details. A fully 3D world with a flying camera, depth of field and lots of floating cards looks impressive in stills but feels chaotic in motion.

- **Scenes are flat and calm.** Light brand background (soft gradient shapes drifting slowly), one caption at the top (masked word reveal), one hero element in the middle (a phone mockup with a real screenshot, a card, a TV), at most 2-3 chips/stickers. Lots of white space. Nothing important below y ≈ 1570.
- **3D happens in transitions, ~0.5-1 beat long, eased in-out:** card flip of the phone (front face → back face), cube turn of the whole scene, the layout tilting back into a floor while the next element rises from below, flying out of depth (`translateZ(-2000px)` → 0), folding two phones shut like a book, a door swing (rotateY around the left edge) revealing the end card.
- **Small 2.5D details inside scenes:** elements enter with a flap (`rotateX(-90deg)` → 0 from their top edge) instead of a fade, a slow idle tilt of the phone (±3°), a flip-board tile for changing values (A → A# → H), a TV that switches on with a CRT line, stickers that swing in with `rotateY`.
- **One idea per scene, a story arc over the video.** Two structures that worked: feature tour (hook → search → song → team → CTA) and problem → solution (a chaotic group chat on Sunday morning → everything in one place → for players and singers → on the big screen → "Sunday without stress").
- Code for every transition and the CSS-3D pitfalls (opacity/filter flattening, z-fighting, nested perspective) are in `references/transitions-2-5d.md`. Read it before building.

## Storyboard template (20 s, 10 bars at 120 BPM; scale beats to the song's tempo)

| beats | scene (flat 2D layout) | 3D transition out |
|---|---|---|
| 0-8 | Hook: category pill + big headline readable at frame 0; a grid of real items flaps in row by row on the beats, one gets selected | grid tilts back into a floor, the phone rises from below |
| 8-16 | Feature 1 on a phone with a real screenshot (typing, results), 2 chips flap in | phone card-flips; its back face is the next screen |
| 16-24 | Feature 2 on the same phone, values change on a flip-board tile on each beat | the whole scene turns like a cube |
| 24-32 | Feature 3: a tidy card (playlist, team) whose rows flap in on beats, tidy connectors draw to people | the scene swings open like a door |
| 32-40 | CTA: logo flips in, headline, button, URL; hold 3-4 s (ideally the music's drop lands here) | none |

Write the plan for the user before building, but don't wait for approval on small choices.

## Tooling

### Remotion (motion graphics)

- Use Remotion (React → video): `npx create-video@latest` (blank template), 1080×1920, 30 fps. If the user already has a Remotion project, reuse its `package.json` and effects instead of starting over.
- Build a small reusable effects file (`src/fx.tsx`) early: `Reveal` (word/line entrance), `Chip` (feature pill popping on a beat), an animated background, `Flash`, `Shockwave` (expanding ring on impacts), `Iris` (circular portal/mask transition), `BrandWipe` (brand-colored push between scenes), `Grain` and `Vignette` overlays. Every scene is then composed from these.
- Drive everything from time, not frames: `const t = frame / FPS`, `const b = k => b0 + BEAT * k`, tweens via `tw(t, t0, dur, easing)`. Scene boundaries are constants in beats, so changing the music's phase moves everything consistently. Keep `music.json` = `{bpm, b0, file}`.
- **`b0` convention** (all scripts of both video skills): the time in seconds of beat 0 *in the excerpt that plays in the video*, not in the source file. Cut the excerpt exactly on a beat (`scripts/bars.py` and `scripts/section.py` print such a start) and `b0` is 0. `sfx_mix.py --b0` uses the same value.
- **Minimal project without the template** (e.g. when you copy an existing `node_modules`): `package.json` (`remotion`, `@remotion/cli`, `react`, `react-dom`), `tsconfig.json` (`{"compilerOptions": {"jsx": "react-jsx", "esModuleInterop": true, "resolveJsonModule": true, "strict": false}}`; Remotion refuses to bundle without it once a `remotion.config.ts` exists), `src/index.ts` (`registerRoot(Root)`), `src/Root.tsx` (`<Composition id fps width height durationInFrames component/>`).
- Footage: `<Sequence from><OffthreadVideo playbackRate startFrom/></Sequence>`; set `playbackRate = sourceLength / sceneLength` to fit a shot exactly into its bars.
- Pixel-precise layouts (e.g. where each word is, so a ball can land on it): measure text with PIL from the same TTF (`getlength` + letter-spacing) and write a JSON the composition imports.
- Check stills before rendering: `npx remotion bundle src/index.ts --out-dir=build`, then `npx remotion still build <Comp> out.png --frame=N --scale=0.3`, tile them with ffmpeg and look at them. Check the exact frames of landings, cuts and frame 0.

### Rendering

- Remotion needs a Chromium it can start in headless mode (`render.sh` passes `$CHROME_PATH` on; alternatively `Config.setBrowserExecutable(...)` in `remotion.config.ts`). Recent Chrome/Chromium builds removed the old headless mode ("Old Headless mode has been removed"); pass a `chrome-headless-shell` binary instead: `--browser-executable=$CHROME_PATH` on `remotion still/render`. A Playwright install has one under its browsers folder (`$PLAYWRIGHT_BROWSERS_PATH/chromium_headless_shell-*/…/headless_shell` or `chrome-headless-shell`); otherwise let Remotion download its own.
- Script paths below are relative to this skill's folder; run them from the Remotion project root.
- Loudness is normalized once, at the end: either `render.sh` does it (default), or the mix already is (`sfx_mix.py`), then run `LOUDNORM=0 scripts/render.sh …`.
- Rendering is slow on CPU. Use `scripts/render.sh <Comp> <frames> <audio.wav> <out.mp4>`: it renders 1 s chunks, skips chunks that already exist, then muxes the audio and loudnorms to −14 LUFS. It is resumable, so if the environment limits command length or kills background jobs, run it in the foreground and re-run until it prints `ALLDONE`. If the workspace can be wiped (ephemeral containers), keep the project and its Python environment somewhere that survives a rebuild: a rebuild once deleted a whole working directory, including two finished videos and the venv.
- If long renders get killed when the agent's shell or session restarts, start them detached and resumable: `setsid nohup bash -c 'for i in 1 2 3; do ./render.sh … && break; done' >> out/render.log 2>&1 < /dev/null & disown`, then poll `out/render.log` for `ALLDONE`.
- A killed run can leave a truncated `-share.mp4` next to a complete main file. Before showing a file, check that exact file (`ffprobe` duration and frame count). For simple 2D scenes the share copy can be larger than the main file; send the smaller one.
- Concurrency must not exceed the CPUs actually available: in containers the cgroup quota (`/sys/fs/cgroup/cpu.max`) is often lower than `nproc`. `render.sh` reads it; override with `CONCURRENCY=n`.
- To fix one part, delete only the affected chunks (`out/chunks/cN.mp4` = second N) and re-run.
- `render.sh` also writes a smaller `-share.mp4` (~7 Mbit/s) for previews and tools/chats with file-size limits.

### Clean 3D footage of a web scene

`scripts/rec3d.mjs` opens a three.js web scene (e.g. a Turbl game) in headless Chromium, freezes time, sets a scripted camera per frame and saves 1080×1920 JPEGs (config JSON: `url`, `out`, `shots[{name, frames, keys:[{pos, look, fov}], ease, build}]`, optional `threeModule`, `chrome`, `css`, `buildFn` to animate the scene assembling; details in the file header). It needs `puppeteer-core` resolvable from the script's location, so copy it into the video project and `npm i puppeteer-core` there, and a Chromium binary (`$CHROME_PATH`). Software rendering is slow (~3 s/frame), so record only what you need, then `ffmpeg -framerate 30 -i out/<shot>/%04d.jpg -c:v libx264 -crf 14 -pix_fmt yuv420p public/<shot>.mp4`.

### Voice-over

If the video has narration, follow the `voice-over` skill in this repository (Google Gemini TTS, word timings for captions and cuts, mixing under music).

### Music: ask the user first

**Never write the music yourself.** No music synthesized in code (numpy/WebAudio/MIDI rendered by a script, sine-wave melodies, programmatic beats), not even as a placeholder or fallback. The music is always an existing track (the user's, or a properly licensed one) or generated by a music generator (Suno, ACE-Step, …). Only short sound effects (clicks, whooshes, thuds, dings) may be synthesized. If no track can be obtained, stop and ask the user instead of shipping self-made music.

You cannot listen to music, so your choice is a guess. Ask for a track (a file, a link, or a video whose music they like: `ffmpeg -i ref.mp4 -vn -ac 2 -ar 48000 music.wav`) before you search. Without one, offer two variants and say you could not listen. Notes from trying:

- Free generators: the `bpm` parameter of ACE-Step was ignored (asked for 100, got 133) and the mp3 had broken frames at the end; decode to wav and measure before use. The user called the result "terrible".
- Free catalogs: Kevin MacLeod's incompetech.com has a machine-readable list (`https://incompetech.com/music/royalty-free/pieces.json`: title, bpm, feel, instruments, description; files at `…/mp3-royaltyfree/<title>.mp3`, CC BY 4.0, attribution required). Filtering by feel is easy, but the style is often dated or generic; polka-like tracks sound like a kids' game. Pixabay and Bensound refused scripted downloads (403).
- Measure every candidate with `scripts/beats.py` (prefer tracks where kick and full-band tempo/phase agree; `--min/--max` for tempos outside 110-150 BPM, otherwise you get half or double tempo), then `scripts/bars.py <file> <bpm> --land <beat> --dur <s>`: energy per bar, the downbeat, the lifts, and the excerpt start that puts the strongest lift on that beat of your timeline.
- **Where the lift goes (one rule):** on the biggest transition of the video. When the CTA is that moment (a classic build → drop ending), that is the CTA; in a multi-part motion-design video it is usually the morph into the last content part.

### Free AI music

If the user wants generated music, use a free tool.

1. **ACE-Step on Hugging Face** via `gradio_client` (`pip install gradio_client`):
   - `ACE-Step/ACE-Step` (`/__call__`, fast): uses the shared anonymous ZeroGPU quota, often exhausted ("exceeded your ZeroGPU quota").
   - `WeReCooking/ACE-Step-CPU` (`/generate`, has a `bpm` parameter): no quota, ~6 min per track. See `scripts/gen_cpu.py` (`--caption`, `--bpm`, `--duration`, `--out`). It returns only ~16 s of music even when asked for 22 s.
2. **boppy.me** (no signup): a few songs per day, then "That's all for today".
3. Prompt: genre + "punchy four-on-the-floor kick, snappy claps, catchy synth hook, <mood>, sports/tech promo, instrumental", lyrics `[Instrumental]`. Generate 2+ variants.
4. Measure with `scripts/beats.py <file>`: prefer the track where the kick-band and full-band tempo/phase agree; a weak or syncopated kick makes beat-sync look wrong. Then `scripts/bars.py` for the structure.
5. Too short? `scripts/extend.py <src> <phase> <out.wav> [bpm] [seconds]` repeats whole bars on the bar grid with short crossfades.
6. Loud masters clip when SFX are added on top: scale the music to ~0.45 before summing and check `max_volume` (ffmpeg `volumedetect`) of the result. The `motion-design-video` skill's `scripts/sfx_mix.py` takes a cue list in beats and does this.
7. Mix with `scripts/audio.py <project> [out.wav]`: music + synthesized SFX at beat times, low-pass/duck during slow-mo, fade the last 0.4 s. It is a template for one 20 s storyboard: copy it into the project and rewrite the cue list for your scenes.

### Suno (when the user is logged in to suno.com in the browser)

Better music than the free generators. Drive the logged-in browser:

1. `suno.com/create` → **Advanced**. Leave the lyrics empty (= instrumental). Fill the *Styles* textarea; its placeholder changes randomly, so select the visible textarea whose placeholder contains a comma and not "Describe", mark it with a data attribute and fill that. Don't fill the title field: the text tends to land in the styles box.
2. Click the visible **Create** button. Suno often shows a CAPTCHA (hCaptcha images or Cloudflare "Verify you are human"). Never try to solve it yourself: ask the user to solve it (hand them the browser if your environment can). If nobody answers, don't wait; finish the video with a fallback track and offer to swap the music later.
3. One click makes 2 full songs (v6-mini, 2-3 min) plus 2 "V6 PREVIEW" clips that a free plan can't use.
4. Download only through the song page → "More options" → Download → MP3 → "Unlock & Download". The file lands in the browser's download folder. Free plans have a small download quota (it showed 7), so download only the song you will use and tell the user how many are left. The CDN `.m4a` behind the player is obfuscated and unusable.
5. Songs are full-length with intros and builds, so find the best 20 s: `scripts/section.py <song> [bpm]` computes the beat contrast in sliding 20 s windows, then `scripts/bars.py <song> <bpm> --land <beat>` shows the structure (build-up → drop) and the start that puts the drop on the biggest transition (see the rule above).
6. Don't time-stretch the song to your grid. Set `music.json` bpm to the song's tempo (e.g. 128.65) and let the beat-based timeline re-time itself; compute the total beats as `round(20 / BEAT)`.
7. Tell the user that a free Suno plan probably gives no commercial rights and that they should check the terms before publishing.

Tell the user which site generated the music. You can't listen to it, so say so and let them judge how catchy it is.

## Before sending

Do at least one full review pass as the viewer, on the rendered file (see section 3 of the `marketing-content` skill: is everything easy to understand, is anything weird), fix what it finds, then go through this list:

- Frame 0 tells what it is; the key word (VR, AI, …) is visible and emphasized.
- Contact sheet (2 fps) of the final file: no empty frames, no overlapping texts in morphs, captions not covered by the motif, nothing important in the bottom ~350 px (platform UI).
- Every scene change is motivated by motion (a 3D flip/turn/fold/rise, not a cut or a plain fade).
- Landings and cuts sit on beats; loudness ≈ −14 LUFS; exactly the planned length.
- The file you show has the full duration and frame count (check that exact file, not its sibling).
- Every claim on screen is verified on the live site (feature works without login? number of songs = pages × items per page?). Mock UIs (chat, playlist) are fine, but tell the user which parts are illustrations.
- Share the smaller of the main file and the `-share.mp4` with the user (attach or show it if your environment can), give the path to the full-quality file, and list what you could not check (e.g. listening).
