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
| `engaging-video` | Short, beat-synced vertical promo videos (Reels/Shorts/TikTok) in Remotion: clean 2D layouts with 3D transitions, real footage, AI music (Suno or free generators). |

Skills are invoked automatically by their description, or explicitly as `/pavlin-skills:<skill>`.

## Adding a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter (helper scripts go to `skills/<name>/scripts/`).
2. Bump `version` in `.claude-plugin/plugin.json` — installed copies only update when the version changes.
3. Check with `claude plugin validate .`
