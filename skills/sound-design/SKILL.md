---
name: sound-design
description: How to do the sound of a video - mix levels of voice, music, sound effects and ambience, which moments get a sound (and which don't), carving room for the voice, editing the music to the story (tape-stop, drop-out before a punchline, muffled stretch, return on a downbeat), and mastering for YouTube/Shorts/Reels/TikTok. Also how to make a video sound like a living world (room tone, foley for every visible action, accents, reactions) with real recorded effects from free libraries instead of synthesized beeps. Use whenever a video gets sound effects, music or narration mixed together, or when the user says a video sounds poor or empty ("chudé", only voice and music), or the sound is too loud, too busy, the effects or engines are "hrozně hlasitý", the voice is hard to hear, or the video is not catchy because of the audio.
---

# Sound design and mix

The sound is judged in the first seconds, mostly on phone speakers and cheap earbuds. In a narrated story video the user's first complaint was not the effects themselves but that "the engines, the noise and everything are terribly loud". Measured, the effects sat only ~9 dB under the voice. After re-mixing to the levels below, with half the effects and the music cut to the story, the user called the video "skvělé".

You cannot listen. Work from measured numbers, say which numbers you used, and ask the user to check on a phone.

## 1. The hierarchy: the voice is the anchor

Set everything relative to the voice and measure it in LUFS (gated loudness, silence does not count), not by peak or by guess:

| Layer | Level vs the voice | Notes |
|---|---|---|
| Voice | 0 (anchor) | high-pass ~80 Hz, gentle compression so words sit evenly |
| Music | about -16 dB overall, -18 or lower under words | ducked while the voice speaks (~0.3 s release), back up in pauses; 3 dB dip at 2.5-5 kHz |
| Sound effects (accents) | about -15 dB | short; never on top of a key word |
| Foley (steps, doors, hands, objects) | about -22 to -26 dB | in the fx stem at a lower gain (0.3-0.5) than the accents |
| Ambience / beds (engines, wind, room, crowd) | about -25 to -30 dB | step back a few dB under words; don't raise them in pauses much |

Final master: about -14 LUFS integrated (-16 to -14 is fine), true peak under -1 dBTP. Don't push louder: platforms turn it down anyway and you lose dynamics.

For a music-led promo without narration (the `engaging-video` style), the music is the anchor instead and effects sit ~10 dB under it.

## 2. Enough sound: a world, not just a voice and music

A video with only a voice and music sounds poor and flat ("chudé"), however good the picture is: the world on screen makes no sound, so it doesn't feel real. The fix is many quiet sounds, not loud ones. The first complaint ("terribly loud") was about levels, not about the number of sounds; keep both lessons: **many sounds, low levels**.

Four layers, from the bottom:

1. **A bed under everything** (amb stem): room tone or the ambience of the place (a court's murmur, a prison's hum and far-off doors, street traffic, wind on a hill). It runs from the first frame to the last and changes with the location on a cut. Never digital silence under the voice: even a quiet room has a tone.
2. **Foley for every action the viewer sees:** footsteps (on the right surface), sitting down, a door, keys, a hand on a table, paper, a cup put down, clothes rustling on a big gesture. Quiet, on the frame the action happens. Repeated sounds vary (`vary`, several takes), or they sound like one sample on repeat.
3. **Accents on the story beats:** a whoosh on a real cut, an impact when something lands, a pop when something appears, comedic sounds (a boing, a record scratch, a slide whistle) on a joke, a riser into a reveal. These are the loud ones, so keep them few.
4. **People in the world reacting:** a crowd's gasp, laughter, a murmur that swells after a shocking line, a single "hm?". They make a scene feel inhabited and land a punchline better than any effect.

How much, for a 30-45 s short with characters on screen: the bed all the time, foley for each visible action (often 20-40 cues), 8-15 accents, a few reactions. Go through the shot list: every shot has at least its bed and one sound of something happening in it. A shot where things move in silence is the "poor" one.

Still true:
- An accent that lands on a spoken key word competes with it: move it into the gap before or after the word. Foley at its low level may sit under words.
- Whooshes only on real scene changes, low and airy.
- Silence is a sound: before a punchline drop the music, keep only the bed and let it swell a little.
- Fewer layers where nothing physical is on screen (a pen drawing, motion graphics): there the bed and the accents carry it, foley has little to follow.

## Real recordings, not synthesized beeps

Physical things (steps, doors, crowds, impacts, cloth) need recorded sounds: synthesized ones are fine for ticks, pops and UI marks, but anything physical made of sine waves and filtered noise sounds cheap. Find and download them with `scripts/find_sfx.py`:

```
python3 scripts/find_sfx.py search "metal door slam"
python3 scripts/find_sfx.py get oculus:DOORMetl_HatchClose_OS_01 --out sfx
```

- **sfx-kit** (CC0, no credit): whooshes, impacts, pops, UI, paper and fabric foley, mechanisms, applause, clocks, money. Each sound has a sync point: `get` prints it, put it into the cue as `sync`.
- **Oculus Audio Pack 1** (CC BY 4.0): footsteps on six surfaces, doors, voices and efforts, room tone and crowd loops, cartoon boings, cloth, metal, tools, vehicles.
- **Freesound** (CC0 and CC BY only) with a free API key in `FREESOUND_API_KEY`: for anything specific the two libraries don't have (a gavel, a cell door clang, a courtroom gasp). Ask the user to create the key if a sound is missing; don't fake it with a synthesized one.
- Search by what it is made of and what happens ("wood knock" when there's no "gavel"). Several takes of one sound are round-robin material for footsteps and taps.
- `get` collects the credit lines into `sfx/CREDITS.md`. Give them to the user for the video's description; CC BY requires it.

## 3. Keep the voice's band clear

Speech intelligibility lives around 2.5-5 kHz. Anything bright and noisy in that band masks words even when it is quiet.

- Synthesized noise (engine, wind, scrape, pen) must be band-limited and darker: rumble 50-500 Hz, wind 200-900 Hz, scrape 300-1800 Hz, pink tilt. White noise or "hiss" at 2.5-6 kHz was the main reason the first mix felt loud.
- Music gets a gentle 2-4 dB dip at 2.5-5 kHz (done by `scripts/mix.py`), plus ducking.
- Punctuation effects: rounded attacks, mostly low or mid tones; avoid piercing clicks above 3 kHz.

## 4. Music as a storytelling instrument

**Never write or synthesize music** (no numpy melodies, no programmatic beats, not even as a placeholder). Use the user's track, a licensed one, or a music generator; see the music section of `engaging-video` for sources. Ask the user for a track first; you can't listen, so otherwise offer two contrasting variants with the same edit and let them pick by ear. For a light documentary story, a jazzy vibraphone track ("Spy Glass", Kevin MacLeod) won over comedic pizzicato.

Then cut the track to the story with `scripts/music_edit.py` instead of laying it flat under everything:

- **Start immediately** on frame 0: the hook needs energy.
- **Tape-stop on the failure word** ("...a oba motory zhasly"): the music slows to a halt as the thing breaks.
- **Come back on a downbeat** exactly at the first word of the next line.
- **Muffle** (low-pass) a suspended stretch: gliding, waiting, "heard from outside".
- **Drop out before the punchline** and let a bed or silence carry the tension.
- **Return on the relief line** from a lively bar of the track, fade at the end.

Measure tempo and phase first (`engaging-video`'s `scripts/beats.py`), check the bars you pick are not quiet passages (RMS per half second), and credit the track (CC BY tracks need an attribution line in the description).

## 5. Workflow and scripts

1. Get the voice timeline: `voice-over` skill (`vo_align.py`, then `vo_timeline.py`), so all times below come from real word times.
2. Download the recordings you need (`scripts/find_sfx.py`, see section 2). Write a cue list for the beds, foley and accents from those times (recordings as `{"t", "file", "stem", "sync", "vary", "dur"}`, see `--help`), then
   `python3 scripts/sfx_stems.py cues.json sfx --duration <s>` → `sfx_fx.wav`, `sfx_amb.wav`. Recordings go into either stem; the synthesized ones (tick, click, pop, ding, chime, thud, whoosh; engine, wind, buzz, scrape; band-limited) are for small marks or when no recording fits.
3. Write the music edit (`edit.json`: bpm, phase, sections with `at`, `bar`, `until`, `end`: tape/fade/cut, `muffle` ranges), then
   `python3 scripts/music_edit.py track.mp3 edit.json music.wav`.
4. Mix and master:
   `python3 scripts/mix.py --vo vo.wav --music music.wav --fx sfx_fx.wav --amb sfx_amb.wav --video video.mp4 --out final.mp4`
   It measures every stem, sets it against the voice (defaults: music -10 dB before ducking, effects -15, ambience -24; ducking 8 dB), masters to -14 LUFS with an oversampled limiter, measures the true peak of the encoded file and tightens the limiter until it is under `--tp` (AAC encoding can push peaks over the ceiling), and prints the result. If the user says a layer is too loud or too quiet, change that one number (`--amb-db -28`), never the whole mix.
5. Check the printed levels against the table in section 1, then ask the user to listen on a phone.

Needs: ffmpeg, `pip install numpy` (`find_sfx.py` needs only Python).

## Before sending

- The voice is one continuous take (`voice-over` skill, section 4): never cut, re-time or speed up the voice to fit effects, music or picture; move those to the voice instead.
- Printed stem levels match the hierarchy (music ~-16, effects ~-15, ambience ~-25 or lower vs the voice); master -16 to -14 LUFS, peaks under -1 dBTP.
- A bed runs under the whole video and changes with the place; every shot has a sound of something happening in it; every visible action (steps, doors, objects) has its foley.
- No accent on top of a key word; whooshes only on big changes; no hissy noise.
- Credit lines from `sfx/CREDITS.md` given to the user for the description.
- Music source, licence and attribution line told to the user; say you could not listen and ask them to check on a phone.
