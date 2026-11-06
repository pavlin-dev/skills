---
name: roblox-style-shorts
description: Make vertical comedy shorts in the blocky yellow-figure 3D style (e.g. "with mom vs with dad") with scripted Blender: rig, bendy limbs, animated faces, gag physics, camera, SFX, music.
---

# Blocky comedy shorts with scripted Blender

Format: 9:16 short, 2-4 contrasting shots ("When I'm with mom" / "When I'm with dad"), each a 4-6 s gag,
caption at the top, music + dense SFX. Everything (characters, set, animation, faces, camera, audio) is
generated from code + one JSON scenario, so new gags reuse the library.

## Files
```
scripts/
  build.py            build one shot: save | board F1,F2 | audit | events | render   (+ --out DIR)
  audio_mix.py        music + procedural SFX + real CC0 recordings placed on exported events -> mix.wav
  assemble.py         caption overlay per shot, concat, mux audio                      (+ --out DIR, --audio WAV)
  lib/kit.py          materials, Character (rig, bendy limbs, joint limits), park + living-room sets, Swing,
                      photoreal accents (framed photos, posters), camera, render settings
  lib/face.py         animated shape-key face (eyes, lids, brows, mouth, mustache, blinks, gaze)
  lib/fonts.py        bold font lookup ($CAPTION_FONT, then fc-match, then Pillow default)
  scenarios/swing.json  reference gag (mom gently pushes / dad launches the kid off the swing)
  assets/             CC0 music, trimmed real SFX, CC0/PD photos, CREDITS.txt
```
Asset paths inside a scenario are relative to `scripts/`. Outputs go to `./out` of the current directory
unless `--out` is given.

Dependencies: Python 3.11+ with `pip install bpy scipy numpy pillow` (`bpy` = Blender 5.x as a Python module;
add `--break-system-packages` if pip refuses a system Python) and `ffmpeg` on PATH. Optional: `fc-match`
(fontconfig) or `CAPTION_FONT=/path/to/bold.ttf` for the caption font.

## Run
```bash
SK=<this skill folder>/scripts
S=$SK/scenarios/swing.json
# 1. look before you render: low-res stills of key frames
#    (use a copy of the scenario with "size": [360, 640], "samples": 10)
python3 $SK/build.py $S dad board 15,27,34,44,66,80 --out out/lo
# 2. checks (must print "LIMITS ... ok" and "JOINT AUDIT: 0")
python3 $SK/build.py $S mom audit; python3 $SK/build.py $S dad audit
# 3. event timings for the sound design
python3 $SK/build.py $S mom events; python3 $SK/build.py $S dad events
# 4. full render, one process per shot (motion blur never crosses a shot boundary)
python3 $SK/build.py $S mom render; python3 $SK/build.py $S dad render
# 5. sound + final video
python3 $SK/audio_mix.py $S out out/mix.wav
python3 $SK/assemble.py $S out/final.mp4 --audio out/mix.wav
```
New gag = new scenario JSON + (if the motion is new) a new action function registered in `ACTIONS` in
`scripts/build.py`. Actions key every frame themselves and write timing facts into `BUILT`
(t_shove, t_release, t_land, ...) for audio and camera.

## Render time, environment and assets
- Cycles on CPU with OIDN denoise works everywhere. Without a GPU, EEVEE/Workbench fall back to software GL and
  are slower than Cycles, so stay on Cycles. Measured on a 2-core CPU: 360x640 @ 10 spp about 8-11 s/frame
  (previews), 540x960 @ 16 spp about 25-30 s/frame, so a 9.6 s video at 15 fps took about 60-70 min. With a GPU,
  set Cycles to GPU (or use EEVEE) and render full resolution at 30 fps in minutes.
- Tell the user the render ETA up front. If the environment stops background jobs when a turn ends, run the
  render in the foreground (or poll it within the same turn) and don't wait for user input mid-render.
- If outbound network is restricted: `raw.githubusercontent.com` often still works. CC0 music and a few field
  recordings are in `SoundSafari/CC0-1.0-Music`. List it with
  `git clone --filter=blob:none --no-checkout --depth 1 ...` + `git ls-tree -r --name-only HEAD`, **never with
  `-l`** (that lazily downloads every blob, about 40 GB), and fetch single files via raw URL (url-quote the path).
  Real photos with a clear license ship with scikit-image (`pip install scikit-image`, see below). If an asset is
  unreachable, ask the user to provide it rather than working around blocks.
- Blender 5 API gotchas: geometry-nodes modifier inputs = `mod.properties.inputs.Socket_N.value`; driver path
  `modifiers["bend"].properties.inputs.Socket_N.value`; for CONSTANT keys set
  `prefs.edit.keyframe_new_interpolation_type` before inserting (layered actions: avoid `action.fcurves`);
  shape-key outline math must never feed a negative base into a fractional power (complex numbers surface as an
  opaque `MemoryError: couldn't create BPy_rna`).

## Characters (scripts/lib/kit.py)
- Metres, stud S = 0.3. Torso 2S x 1S x 2S, head 1.2S cube (bevel 0.06), arms/legs 1S x 1S x 2S; kid scale 0.7,
  adults 1.08-1.12 (+belly). Accessories (hair cap, bun) are bone-parented boxes/spheres.
- Skin yellow `#F5C91E`. **Do not copy the Roblox "Noob"** (yellow + blue torso + green legs is their character):
  give every character distinct clothing colours.
- Armature: every bone points +Z with roll 0, so pose Euler **X < 0 swings a limb/torso/head forward (-Y = facing)**,
  Y twists, Z > 0 moves the lower end toward +X. Bones: root, torso, head, arm_l/r, forearm_l/r, leg_l/r, shin_l/r.
- `JOINT_LIMITS` clamp inside `pose()` and log every clamp (`LIMITS ...`): elbow = 1-DOF hinge X in [-150, 0]
  (folds forward only); knee X in [0, 150] (backward only); arm X [-185, 60]; leg X [-125, 40], Z outward <= 50 /
  inward <= 20; torso X [-45, 25]; head X [-45, 40], **Y +-75 = turn (yaw)**, Z +-35 = sideways tilt (Z on a head looks like a
  broken neck; use Y to make a character look left/right). When the log shows clamps, fix the animation itself.

## Bendy limbs: exact geometric bend (the hard part)
Weight skinning of a box always gives a bulge above the joint or a crease below it, so don't use it. Each limb is ONE
mesh rigidly parented to the upper bone with a geometry-nodes modifier `JointBend`, its Angle driven (SUM driver)
by the lower bone's `rotation_euler[0]`.
- Mesh: rounded-rect profile (corner r 0.04, 4 corner segs, **6 subdivisions per flat side**) along Z, rounded
  caps, uniform rings + **16 dense rings in a band of length 0.12 x depth just below the hinge**.
- Centre C = (limb x, +-(hy - 0.4*depth), hinge z): arc centre 40 % of the depth in from the OUTER face
  (knee outer = front -Y, elbow outer = back +Y; elbow hinge 2.85S, knee 1.0S). `BEND_RADIUS` tunes roundness.
- Per vertex, d = P - C, t = clamp(-dz/band), k = clamp(1 - |angle|/0.06):
  above the hinge unchanged; band flattened to the hinge plane
  (`zz = max(dz,0) + min(min(dz,0)*k, min(dz,0) + band*(1-k))`) and rotated about X around C by angle*t -> exact
  circular outer arc, no bulge; below the band shifted up by the band and rotated by angle -> rigid lower segment.
  Inside the bend the two rigid segments simply intersect -> clean sharp inner corner.
- Hidden-overlap fixes: x *= 1 - bent*(0.004*below + 0.05*innerSide*sin(pi*t)) with bent = 1-k (straight limb gets
  no step line); after deforming, `Set Shade Smooth` (edge domain) sets edges with angle > 50 deg flat so folded
  hidden faces never blacken visible normals.
- `ShaderNodeVectorRotate` with `invert=False` matches pose +X. **Verify by measurement, not by eyeballing a test
  render** (a wrong sign once looked plausible and shipped).
- `audit` mode: every frame, read the evaluated limb mesh in limb-local space; knee lower end must have y > 0,
  elbow y < 0 (skip bends < 8 deg). Must print `JOINT AUDIT: 0`. (Flipping the sign makes it report 544 errors.)

## Animated faces (scripts/lib/face.py, never swap textures)
Atlas swaps show visible UV sliding. Each feature is a flat filled 2D outline 1-3 mm in front of the head's front
face, bound to the head bone, morphed with relative shape keys. Every outline has N = 40 points sampled identically
(top path left->right, bottom path right->left, x = w*cos) so any two shapes blend cleanly.
- Eyes: basis dot, closed (^), sleep (u), blink, pupil, half (heavy lid), wide + additive gaze_x/gaze_z; white sclera
  (big); white highlight (hide); brows (basis collapsed = hidden; flat/angry/up/worried, slope sign per side);
  mouth (flat basis, smile, open, oh, smirk, grin, frown, wobble); optional thick mustache with `lift`.
- Expressions (`EXPR`): neutral, happy, laugh, shocked, scared, smug, proud, sleep, sad.
- Scenario faces timeline: `[t, expr]` or `[t, expr, [gaze_x, gaze_z]]`. `finalize()` holds previous weights at t,
  reaches new at t+0.2 s; auto-blinks every 1.8-3.6 s only when eyes are open and no change is near.
  Give characters gaze targets (at each other, at camera for the punchline).

## Photoreal accents (attention hook)
One REAL photo inside the toy world stops the scroll. Strongest: a big framed real photo that "looks" at the camera
right behind a blocky character with a strong expression (scared kid in front of a giant real cat). Also good:
framed photos on a living-room wall (ambience), a "LOST CAT" poster with a real photo on a lamp post (easter egg).
Keep it to 1-2 per shot, and make it big when it's the joke.
- Scenario `set`: `"type": "room"` gives the toy living room (`kit.living_room`, back wall y=2.3, side wall x=-3.1,
  sofa seat top z~0.47, softer sun so yellow skin doesn't wash out). The default is the park.
- `"photos": [{"file", "pos":[x,y,z], "width", "rot" (deg), "frame" (hex)}]` gives a framed print behind glass
  (Principled + Coat). Back-wall face y = 2.19; side wall face x = -2.99 with rot -90.
- `"posters": [{"poster": {"photo", "title", "name", "line", "reward"}, "pos", "width", "rot", "tilt"}]` composes a
  missing-pet poster with PIL (or use `"file"` for any print).
- Bundled photos come from the scikit-image sample data (chelsea cat and coffee are CC0;
  rocket (SpaceX) and hubble_deep_field (NASA) are public domain). They are in `scripts/assets/photos/`.
  Never use the astronaut image (a real person). For real videos ask the user for their own or licensed photos.
- Seated pose on the sofa: hip at seat top (`loc z = 0.47 - 2*S*scale`), leg X -88, shin X +85.

## Gag animation
- Compute motion in Python and key every frame (pendulum ODE with substeps, ballistic flight with a cartoon boost,
  spins). The swing angle trace is recorded automatically for audio events.
- Cheat off-screen: once the kid leaves the top of frame, re-enter from above at a chosen visible landing spot.
- Comedy structure: identical wide setup in both shots (contrast) -> tension close-up -> payoff -> impact ->
  reaction to camera.
- Keep parents beside/behind the subject, never in line with the camera; make prop frames wide enough
  (swing 3.6 m) that legs don't occlude actors.

## Camera
- `camera` = list of segments `{until, from:{loc,target,lens}, to, shake}` separated by hard cuts; points may track
  actors `{actor: "kid"|"parent", offset, mix, base}`; landing adds a decaying impact shake.
- Baked per frame (frame_set -> resolve -> look_at -> shake), keyed at **f and f+0.6** with CONSTANT interpolation,
  `motion_blur_position = 'START'`, otherwise the frame before every cut smears into the next shot.
- Reference cut list (dad): wide (same as mom) -> tension CU on both faces with shake -> wide shove tilting up to
  track the kid -> low angle at the landing spot with impact shake -> push-in on the parent's face.

## Audio (scripts/audio_mix.py)
- `events` exports swing extremes (+angle), bottom passes (+speed), pushes, shove, release, re-enter, land, cuts.
- Real CC0: schoolyard ambience (-13 dB), real thud on landing, footsteps. Procedural: chain creaks scaled by
  amplitude, clank > 60 deg, whooshes on bottom passes, thumps on pushes/shove, slide whistle up on release and
  down on the fall, low sting into the tension CU, light swishes on other cuts. Music auto-levelled (rolling RMS),
  cut 0.08 s after the launch and resumed on the landing; tanh bus limiter.
- You can't listen: verify with a spectrogram PNG with event markers + RMS per 0.5 s (aim ~-20 dB calm,
  -14..-22 dB action) and say so to the user.
- Voices (laughs, screams) cannot be faked convincingly -> ask the user for recordings (or their own voice).
- Music licensing: viral pop hits are never free -> add trending songs in-app (Shorts audio library / TikTok;
  business accounts only get the Commercial Music Library) and offer an export without music. Downloadable:
  Kevin MacLeod (CC BY 4.0, credit required; sample-based, heavily memed), Pixabay (no credit, Content ID claim
  risk), YouTube Audio Library. Keep `scripts/assets/CREDITS.txt` current. For levels and music editing, the `sound-design` skill in this repo goes deeper.

## Workflow & QA (every iteration)
1. Storyboard: key frames of every shot at 360x640 / 10 spp, tile with PIL, look (beats read, faces visible,
   no occlusion/crop).
2. Joints: side-view strip (pure side camera, swing hidden) around big moves; look at knees/elbows.
3. `audit` both shots: `LIMITS ok`, `JOINT AUDIT: 0`.
4. When the user iterates on a detail, show 1-few frames, not a full render. Render the full video only when asked.
5. After render: inspect frames on both sides of every cut, contact sheet, assemble with mix, ffprobe that video +
   audio streams exist.
6. Report honestly what is still weak (procedural sky vs real HDRI, 15 fps, missing voices).

## Known weaknesses / next steps
- Sky, ground and trees are procedural; swapping in a real HDRI (e.g. from Poly Haven) is the biggest visual win.
- 15 fps previews; final should be 30 fps on a GPU machine.
- No voices yet; only 3 real SFX recordings.
