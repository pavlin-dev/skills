---
name: toon-3d-storytime
description: The "storytime" 3D cartoon look of popular narrated true-story shorts (someone in court, in prison, at work) - skin-coloured round heads, big round white eyes with a thick outline and a pupil that looks around, no nose, open mouths with teeth and a tongue, worried / dizzy / bored faces, costumes (prison stripes, a guard's peaked cap), warm interior sets, one-word captions. Built on the toon-3d-animation toolkit; this skill adds the look (look.js, a face sheet, an example prison cell). Use when the user wants a video "in this style" and shows such a short (round white eyes, beige or brown heads, courtroom or prison), or asks for the storytime / round-eye toon look rather than the default toon-3d-animation look.
---

# Toon 3D: storytime look

A variant of `toon-3d-animation`. Everything about building, animating, timing to the voice and rendering comes from that skill: read it first. This skill only says what is different in this look and ships the pieces for it.

## The look (compared with the default toon look)

| | default toon-3d-animation | storytime |
|---|---|---|
| Heads | white, lifted under coloured light | skin tones, varied across the cast (`SKIN` in `look.js`) |
| Eyes | black ovals with a catchlight | big white eyes, thick outline, round pupil with a catchlight (`EYES.round`) |
| Nose | small arc | none |
| Open mouth | black shape | dark red inside, white upper teeth, a pink tongue, outlined |
| Typical faces | smile, sly, awe... | worried (raised inner brows, wavy mouth), dizzy (spiral eyes, big grin), bored (lids cut straight across, small flat mouth), glad |
| Sets | living rooms, offices, markets | warm interiors: courtrooms, prison cells, corridors, waiting rooms |

- **The faces carry the video.** Eyes and mouth are what people read first in this look, so check them before anything else on the face sheet. Things that came up:
  - An open eye must keep its whole outline. When the lid clip cut its top, it "looked clipped".
  - Only a half-closed eye is cut by a lid, along a straight line (the bored guard).
  - Pupils look somewhere: at the other character, down in shame, sideways when worried (`gx`, `gy` in `FACES`, -1..1). Eyes that always stare straight ahead look dead.
- **Costumes say the role at a glance:** prison stripes (`stripes(c)`), a guard's olive uniform with a peaked cap (`peakedCap(c)`), a judge's black robe, a suit. One costume detail per character, as in the default look.
- **Sets:** warm beige and wood interiors with one strong accent colour (a teal lower wall, a red window), dressed densely: a sign on the wall ("NO LAUGHING" in a courtroom is the kind of joke this genre likes), a calendar with crossed-out days, tally marks, a framed picture, a bunk, a toilet, a lamp. Bars, railings and benches in the foreground give depth; keep them out of focus, but never across a face on the key word.
- **Captions:** white Inter Black with a black outline, one or two words at a time, centred, as in the default look.

## Start a project

```
scripts/setup.sh <dir>
```

It runs `toon-3d-animation`'s `scripts/setup.sh` (found next to this skill, or set `TOON3D_DIR` to its folder) and adds:

- `look.js`: `storyChar({ skin, hair, shirt, ... })` (makeChar with round eyes and a skin tone), `SKIN`, `skin(c, tone)`, `stripes(c)`, `peakedCap(c)`. Import it in `story.js` next to `toon.js`.
- `faces.html` + `faces.js`: a face sheet, eight expressions in close-up over four skin tones. Render it first and look at it; change faces here (seconds per round), not in full renders.
- `cell.html` + `cell.js`: an example set, a prison cell with a prisoner behind bars and a guard outside. Copy its set-building patterns into your `story.js`.

Render with `toon-3d-animation`'s `scripts/render.mjs`, as described there.

## Before sending

The checks of `toon-3d-animation`, plus:
- Every open eye has its full outline, in close-ups too.
- Pupils point at what the character is reacting to.
- Skin tones stay as picked under the set's light (warm light turns light skin orange: lower the light's saturation, not the skin).
- No bar or railing crosses a face in the shot where that face changes.
