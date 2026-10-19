# Agent instructions

This repository is a Claude Code plugin (`pavlin-skills`) and its marketplace (`pavlin-dev`). Each skill lives in `skills/<name>/SKILL.md`, its helper scripts in `skills/<name>/scripts/`. People install it on their own machines, so every skill must work anywhere.

## Skills must be portable

A skill describes *how to do the job*, not the machine it was first written on. When writing or editing a skill or its scripts:

- **No absolute or machine-specific paths.** No `/workspace/...`, `/home/<user>/...`, `/tmp/<something>`, `/usr/bin/chromium`, venv paths, or paths to other projects. Scripts take inputs as arguments, environment variables or a config file, and fall back to the current directory or `os.tmpdir()` / `tempfile`.
- **No references to files that only existed in one session** ("copy from the existing project in …", "already rendered shots are in …"). If an example project is needed, describe what it contains so the agent can build it, or ship it inside the skill folder.
- **No assumptions about the runtime.** Don't name tools that only one harness has (e.g. a specific "show file" tool), a specific CPU count, OS, sandbox or idle-reset behaviour. If a limitation matters, phrase it conditionally: "If the environment kills background jobs, render in the foreground…".
- **Name dependencies, don't assume they're installed.** Say how to install them (`pip install gradio_client`, `npm i puppeteer-core`) and how to find an existing binary (env var, `which`, common locations).
- **No hidden coupling to one project.** Hardcoded URLs, build hashes, file names or timings from one concrete project are examples, not defaults. Make them parameters, or mark the whole script clearly as a template to adapt.
- **Reference other skills only if they are in this repo**, or phrase it as optional ("if a copywriting skill is available, follow it").
- **Script paths in SKILL.md are relative to the skill's folder** (`scripts/beats.py`).
- **No secrets, tokens or personal data.**

## Before committing

1. `grep -rnE '/workspace|/home/|/tmp/|/usr/bin/|/opt/|\.venv' skills/` returns nothing (or only a deliberate, generic fallback).
2. Every script runs with `--help` or with no arguments prints its usage, and has no syntax errors (`python3 -m py_compile`, `node --check`, `bash -n`).
3. `claude plugin validate .` passes.
4. If a skill changed in a way users should get, bump `version` in `.claude-plugin/plugin.json`; installed copies only update when it changes.
