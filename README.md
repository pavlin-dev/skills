# pavlin-dev skills

Claude Code skills packaged as a plugin. This repository is both the plugin (`pavlin-skills`) and its marketplace (`pavlin-dev`).

## Install

```
/plugin install pavlin-skills --marketplace pavlin-dev/skills
```

Or in two steps (works on older Claude Code too):

```
/plugin marketplace add pavlin-dev/skills
/plugin install pavlin-skills@pavlin-dev
```

Update later with `/plugin marketplace update pavlin-dev`.

## Skills

| Skill | What it does |
|---|---|
| `engaging-video` | Short, beat-synced vertical promo videos (Reels/Shorts/TikTok) in Remotion: hook, story, sound design, music, rendering; two styles (motion design, 2D layouts with 3D transitions). |
| `motion-design-video` | Motion-design promo videos where vector shapes morph into the next scene under one shared 3D camera: workflow, Remotion patterns, SFX mixer, contact sheets. |
| `marketing-strategy` | Thinking like a marketer before making content (B2B and B2C): positioning, buying situations, awareness levels, point of view, raw material only the product has, channel choice, and a cycle of hypothesis, content, measurement and lessons kept in a strategy file (template included). |
| `marketing-content` | Marketing content in general (posts, images, ad copy, videos): research and verified claims, platform fit, and a mandatory review pass as the audience before handing it over. |
| `voice-over` | Narration for videos: script written for the ear, Google Gemini TTS via AI Studio (https://aistudio.google.com/generate-speech), checking the take via transcription, word timings for captions and cuts, mixing under music. |
| `marketing-storytelling-video` | The default for marketing videos (YouTube, Shorts, Reels, TikTok), told as a user's story instead of an ad: the moment of need, the user as hero and the product as the tool at the stuck moment, story beats, no branded end card, faceless execution with screens and voice-over, honesty rules. |
| `sound-design` | Sound for videos: levels of voice, music, effects and ambience measured in LUFS, a living world of sound (bed, foley, accents, reactions) from real recordings in free libraries (`find_sfx.py`), keeping the voice's band clear, cutting music to the story (tape-stop, drop-out, muffle), mastering; scripts for effect stems, music edits and the mix. |
| `storytelling-video` | Narrated story shorts that promote nothing (true stories, history, "how did that happen"): picking a story, hook, escalation, 30-45 s length, fact checking, a living pen-drawing style with a ready template (ink.js, scenes keyed to the voice's word times, headless render) or motion design. |
| `cartoon-world-video` | The coloured cartoon "How it works" look as one continuous world under one camera: living outlines, shaded flat fills, label boxes, a reacting mascot, top captions, full-size "ghost" comparisons that fold into the real thing, camera moves instead of cuts; template (toon.js kit, camera engine, example world) and headless render. |
| `shorts-hook` | Opening a vertical short so people don't swipe away and keeping the picture alive: the first sentence (hook types, rules, weak vs strong rewrites, picking from candidates), first frame + on-screen text + voice in the first second, motion from frame zero, a visual-change budget, the loop, and a script that finds still stretches and a weak opening in a render. |

Skills are invoked automatically by their description, or explicitly as `/pavlin-skills:<skill>`.

## Session rules

The plugin injects `hooks/style-rules.md` into every session start (no long dashes, only the short hyphen). Edit that file to change the rules.

## Adding a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter (helper scripts go to `skills/<name>/scripts/`).
2. Bump `version` in `.claude-plugin/plugin.json`: installed copies only update when the version changes.
3. Check with `claude plugin validate .`
