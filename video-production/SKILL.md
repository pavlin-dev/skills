---
name: video-production
description: Practical toolkit for building short videos on this machine - Remotion compositions, capturing real product footage (3D web scenes, website flows), free AI music, beat detection, sound effects and resumable rendering. Use together with `engaging-video` when actually building a video, or when a render, capture or music step fails.
---

# Video production toolkit

`engaging-video` decides what to make and judges it. This skill is how to build it here. Read only the reference you need right now:

| step | reference | scripts (in `scripts/`) |
|---|---|---|
| Composition, timing on beats, text layout, stills | `references/remotion.md` | — |
| Real product footage | `references/footage.md` | `rec3d.mjs` (3D scene), `capture_site.mjs` (website flow) |
| Music, beat sync, sound effects | `references/music.md` | `gen_music.py`, `beats.py`, `extend.py`, `audio.py` |
| Rendering and sending | `references/rendering.md`, `references/checklist.md` | `render.sh` |

Ground rules on this machine:

- Keep projects in `/workspace/persistent/<name>`; copy `package.json` + `node_modules` from an existing project instead of installing (`/workspace/persistent/c2v-promo`, `/workspace/persistent/turbl-padel-20s`).
- Start slow things first: kick off music generation in the background at the start, then capture footage while it runs.
- Render in the foreground in resumable chunks; background jobs die when the machine is rebuilt.
- Python with PIL/gradio: `/workspace/turbl-video/.venv/bin/python` with `PYTHONPATH=/workspace/persistent/turbl-yt-54af/pylibs`.

When a step teaches you something, put it in the matching reference file, not in `engaging-video`.
