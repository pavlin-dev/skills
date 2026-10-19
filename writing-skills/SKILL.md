---
name: writing-skills
description: How to write and maintain skills in this repo (SKILL.md files) - what belongs in the main file, what goes to references or a separate skill, and how to refine a skill step by step from real work. Use whenever you create a new skill, update one with lessons from a task, or the user asks to "update the skill" or "remember this in the skill".
---

# Writing skills

A skill teaches a future agent how to **think** about a kind of task. It is read at the start of the work, so every line costs attention. A short skill that gets the thinking right beats a long one full of details.

## Shape

- **`SKILL.md` = the core.** The goal, how to judge the result, the few techniques that matter most, the process. Aim for something readable in a minute (roughly under 60 lines).
- **Principles, not recipes.** "Say what it is in frame 0" generalizes; "put the label at y=430" does not. Give a short concrete example when it makes the principle clear.
- **Details go elsewhere.** Commands, paths, parameters, scripts and workarounds go to `references/*.md` inside the skill, or to a separate tooling skill that the main one points to (e.g. `engaging-video` → `video-production`). Say in one line where they are and when to read them.
- **Scripts** live in `scripts/` of the skill that uses them, each with a usage comment at the top.
- **Frontmatter:** `name` (kebab-case, same as the folder) and a `description` that says what it does *and* when to use it, with the words a user would actually say.

## Always include the critic

Every skill that produces something should tell the agent to judge its own output the way the end user will, critically: what they see first, what confuses them, what is false or misleading, what they will do next. Write the questions down concretely. And tell the agent to report weak spots and unchecked things honestly instead of defending the draft.

## Refine step by step

- Start small. Write only what you are sure of; a skill grows from real tasks, not from imagination.
- After a task, ask: what did I or the user have to correct? What would have saved time? Add only lessons that proved themselves, phrased as general rules, in the right place (core vs. reference vs. tooling skill).
- Prefer editing or replacing an existing line over adding a new one. Remove what turned out wrong or no longer matters.
- Keep task-specific facts (one project's coordinates, one-off numbers) out of the core; at most mention the project as an example in a reference.

## Where skills live

All skills are in the `pavlin-dev/skills` repo, one folder per skill. Change them on a branch and open a PR. The shared copy in `/workspace/persistent/skills/` is synced from the repo after the change.
