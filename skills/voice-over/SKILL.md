---
name: voice-over
description: How to make a voice-over (narration) for a video, reel, explainer or ad - writing the script for the ear, generating the voice with Google's Gemini TTS (AI Studio, https://aistudio.google.com/generate-speech), checking the take without being able to listen, splitting it into lines with word timings for captions and scene cuts, and mixing it under music. Use whenever a video needs narration, a voice, a "voice over", a spoken story, or when the user says the voice sounds robotic or bad.
---

# Voice-over

In a narrated video the voice is the first thing people judge. A robotic voice makes the whole piece look cheap, however good the visuals are: in a test video the visuals were fine and the user called the voice "the worst part". Spend the effort here.

## 1. Write for the ear

- **Spoken language, not written.** Short sentences, everyday words, the way the narrator would really say it (Czech: colloquial forms like "zavřený", "bejt" are fine when the narrator is a person telling a story). Read every line out loud in your head: if you would not say it to a friend, rewrite it.
- **One thought per line.** Each line becomes one caption and usually one visual beat. 3-8 words is a good line.
- **Pace:** about 2.5-3 words per second. A 30 s video holds roughly 70-90 words including pauses. Count before generating.
- **Pauses are part of the script.** A punchline needs silence before it ("A na lásku se rýmuje… *pause* nic."). Mark them (see audio tags below).
- **Grammar must match the narrator.** In languages with gendered verbs (Czech "zapomněl" / "zapomněla"), decide who speaks before writing, and keep captions and the end card in the same form.
- Write numbers, URLs and brand names the way they should be spoken; check how the voice pronounces the brand.

## 2. Generate the voice with Google Gemini TTS (default)

Use Google's Gemini TTS unless the user asks for something else. It is free with a normal Google account, supports Czech and 100+ other languages, and can be directed (emotion, pace, pauses, laughs).

### Manually in AI Studio (no API key)

Give the user these steps (the UI changes; if a button is not where described, ask for a screenshot):

1. Open **https://aistudio.google.com/generate-speech** and sign in. If the right model is not selected, add `?model=gemini-3.8-flash-tts` (or the current Flash TTS model) to the URL.
2. Choose **single speaker** (or two speakers for a dialogue).
3. Pick a **voice**. Voices are described by character, not gender (e.g. Puck: upbeat, Fenrir: excitable, Achird: friendly, Zubenelgenubi: casual, Kore: firm, Leda: youthful, Sulafat: warm). Let the user try 2-3 and choose by ear.
4. Put the **delivery instructions** in the style field, in English (models follow English instructions best), e.g.:
   ```
   Read the text in Czech, natural native pronunciation, stress on the first syllable.
   A young man in his twenties tells a funny true story to a friend, late at night.
   Casual, warm, slightly self-ironic, not like an advert or a narrator.
   Leave about one second of silence between lines.
   ```
   Add per-moment notes for the key lines ("nic." flat and deadpan; "Tmavovláska!" sudden excitement).
5. Paste the **whole script in one run**, one line per row. One take keeps the voice, energy and room consistent; splitting comes later (section 4).
6. Use **audio tags** inside the text, in English even for other languages: `<short pause>`, `<long pause>`, `<laugh>`, `<sigh>`, `<breath>`.
7. **Run**, listen, regenerate or adjust the style until it sounds right.
8. **Download** the WAV: the download icon or the ⋮ menu next to the player, or right-click the player and "Save audio as…". The user then sends the file to you.

### Via the API (when you should iterate yourself)

If the environment has a Gemini API key (e.g. in `GEMINI_API_KEY`), call the speech model directly: see https://ai.google.dev/gemini-api/docs/generate-content/speech-generation for the current model id, voice names, the style field and audio tags. The user creates a free key in AI Studio ("Get API key") and stores it in the environment's settings or secrets. Never ask for a key in the chat.

### Terms

The free tier has usage limits and Google may use the inputs to improve its models: don't put anything confidential into the script. Before commercial publishing, the user should check Google's terms for generated audio. Tell them which model and voice made the take.

### No real take yet: stop, don't ship a placeholder

If there is no API key and the user can't be asked right now (you run unattended, or as a subagent), do **not** deliver a finished video with a fallback voice. In a test run an agent did exactly that, and the user's verdict was that the voice (and the music it guessed) were "nic moc". Instead:

1. Finish everything that doesn't depend on the take: the script, the visuals, the sound effects and the music edit, timed to a placeholder take.
2. Hand over the exact text to paste and the style instructions (section 2), and say clearly that the video waits for the real take.
3. When the take arrives, re-run sections 3-4; the scenes and the mix follow the new word times.

A placeholder render is fine as a draft for timing, labelled as such.

### Other engines (only as placeholders, and say so)

- **Piper** (local, `pip install piper-tts`, Czech voice `cs_CZ-jirka-medium` from the `rhasspy/piper-voices` repository on Hugging Face): works offline, but sounds robotic. The user rejected it.
- **gTTS** (Google Translate voice, `pip install gTTS`): free, no key, but one flat voice per language (female for Czech), no emotion.
- **edge-tts** (Microsoft voices, `pip install edge-tts`, Czech `cs-CZ-AntoninNeural` / `cs-CZ-VlastaNeural`): decent, but an unofficial use of Microsoft's read-aloud service. It needs a WebSocket connection. Behind a TLS-inspecting proxy it fails with certificate errors until its SSL context trusts the proxy's CA bundle (set `edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=<bundle>)`); some proxies block WebSockets entirely, and it also fails intermittently with "No audio was received", so retry a few times. It leaves ~0.85 s of silence after every sentence: use `vo_align.py --squeeze 0.35`.
- Paid alternatives the user may prefer: ElevenLabs, or Google Cloud Text-to-Speech (Chirp 3 HD voices, needs a Cloud project with billing).

## 3. Check the take you cannot hear

You can't listen, so check what you can and ask the user for the rest:

- **Transcribe it** and compare with the script. `scripts/vo_align.py` does this (see below) and prints `LISTEN:` for each place where the voice said something other than the script, e.g. an extra word ("v obchody zavřený") or a changed one ("A já" heard as "A je na"). Whisper itself mishears some words, so these are places to listen, not proof of an error. Small spelling noise (ý/í) and numbers that whisper writes as digits ("1983") are ignored. Use the `medium` model for the check; `small` invents many false `LISTEN` lines.
- **Length:** compare the take's duration with the planned video length.
- **Ask the user to listen** for what a transcript can't show: wrong stress, English accent, the brand name, whether the emotion lands, clicks or artefacts. Name the exact lines `LISTEN:` flagged.

## 4. Split into lines and time everything to the words

```
python3 scripts/vo_align.py take.wav script.txt vo/ [--model medium] [--lang cs] [--squeeze 0.35]
```

`script.txt` holds one line per row as `id|text` (audio tags allowed). The script transcribes the take with faster-whisper (`pip install faster-whisper numpy`, ffmpeg needed; the model downloads on first use), aligns it to the script word by word, and writes `vo/<id>.wav` per line plus `vo/align.json` (start, end, duration, and each word's time relative to its line). `--squeeze` first shortens every silence longer than the given seconds (for TTS takes with long pauses after each sentence; it shortens performed dramatic pauses too, so add those back with `--extra` below).

Then lay the lines out on the video's timeline:

```
python3 scripts/vo_timeline.py vo/ [--extra <id>=0.9] [--max-gap 0.8] [--show "tisíc devět set osmdesát tři,=1983,"]
```

It keeps the gaps the voice performed (at least `--min-gap`, default 0.1 s, since each line already has ~0.12 s of padding on both sides; at most `--max-gap` if set), adds `--extra` silence before chosen lines, fills in words whisper missed, and writes `timeline.json` (every line and word with absolute `t0`/`t1`) and `vo.wav`. `--show` maps how the narrator says something to how the caption writes it: the matched words get a `show` field (the first the caption text, the rest empty), and captions print `show` when present. Build everything from those numbers, not from guesses:

- Place the lines one after another with **0.2-0.4 s** gaps; keep a longer gap (0.8-1.2 s) before a punchline, as the voice performed it.
- **Captions** change on the word times (a new caption chunk starts when its first word is spoken). Captions are always needed: feeds autoplay muted.
- **Visual beats** land on words: the screen switches to the product on the line that names it, a highlight pops on the word it highlights.
- Typing or other on-screen text that the voice reads should run in sync with the spoken words.
- If the video is music-led (beat-synced), fit the VO into the bars; if it is a story, the voice leads and the music is a bed under it.

## 5. Mix

Follow the `sound-design` skill in this repository: levels relative to the voice (music about 16 dB under it, effects 15, ambience 25-30), few effects and only on story beats, nothing bright in 2.5-5 kHz, music cut to the story, master to about -14 LUFS. Its `scripts/mix.py` measures and sets every stem. Licensed music only (see the `engaging-video` skill).

## Before sending

- Every caption matches what the voice actually says (including the gender forms) and appears with it.
- The `LISTEN:` lines and anything you could not check are listed for the user.
- The user knows which engine, model and voice made the take, and the music source and licence.
