---
name: sound-design
description: How to do the sound of a video - mix levels of voice, music, sound effects and ambience, which moments get a sound (and which don't), carving room for the voice, editing the music to the story (tape-stop, drop-out before a punchline, muffled stretch, return on a downbeat), and mastering for YouTube/Shorts/Reels/TikTok. Use whenever a video gets sound effects, music or narration mixed together, or when the user says the sound is too loud, too busy, the effects or engines are "hrozně hlasitý", the voice is hard to hear, or the video is not catchy because of the audio.
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
| Sound effects (punctuation) | about -15 dB | short; never on top of a key word |
| Ambience / beds (engines, wind, room, crowd) | about -25 to -30 dB | step back a few dB under words; don't raise them in pauses much |

Final master: about -14 LUFS integrated (-16 to -14 is fine), true peak under -1 dBTP. Don't push louder: platforms turn it down anyway and you lose dynamics.

For a music-led promo without narration (the `engaging-video` style), the music is the anchor instead and effects sit ~10 dB under it.

## 2. Restraint: sound only the moments that matter

Sounding every movement makes a video busy fast. One well-placed sound does more than a pile of them.

- Give a sound to **story beats**: the failure (engines die + a cockpit chime), a reveal, an impact, a number landing, relief at the end. Skip it for routine motion: every camera pan, every line the pen draws, every label appearing.
- A good count for a 40 s narrated video: 10-15 distinct moments, plus 2-3 beds. If you have a sound every second, cut half.
- Whooshes only on the big scene changes (2-4 per video), and low and airy, not hissy.
- An effect that lands on a spoken key word competes with it: move it into the gap before or after the word.
- Silence is a sound. A gap before a punchline (music out, only a thin bed swelling) makes the punchline land.

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
2. Write a cue list for the effects and beds from those times, then
   `python3 scripts/sfx_stems.py cues.json sfx --duration <s>` → `sfx_fx.wav`, `sfx_amb.wav` (tick, click, pop, ding, chime, thud, whoosh; engine, wind, buzz, scrape; all band-limited, see `--help`).
3. Write the music edit (`edit.json`: bpm, phase, sections with `at`, `bar`, `until`, `end`: tape/fade/cut, `muffle` ranges), then
   `python3 scripts/music_edit.py track.mp3 edit.json music.wav`.
4. Mix and master:
   `python3 scripts/mix.py --vo vo.wav --music music.wav --fx sfx_fx.wav --amb sfx_amb.wav --video video.mp4 --out final.mp4`
   It measures every stem, sets it against the voice (defaults: music -10 dB before ducking, effects -15, ambience -24; ducking 8 dB), masters to -14 LUFS with a true-peak limiter and prints the result. If the user says a layer is too loud or too quiet, change that one number (`--amb-db -28`), never the whole mix.
5. Check the printed levels against the table in section 1, then ask the user to listen on a phone.

Needs: ffmpeg, `pip install numpy`.

## Before sending

- Printed stem levels match the hierarchy (music ~-16, effects ~-15, ambience ~-25 or lower vs the voice); master -16 to -14 LUFS, peaks under -1 dBTP.
- No effect on top of a key word; whooshes only on big changes; no hissy noise.
- Music source, licence and attribution line told to the user; say you could not listen and ask them to check on a phone.
