# Rendering on this machine

- The machine is rebuilt when idle, which kills background jobs and wipes everything outside `/workspace`. Keep projects in `/workspace/persistent/<name>` and **render in the foreground** with `scripts/render.sh` (chunks of 1 s, resumable, max 10 min per tool call, re-run until `ALLDONE`).
- Concurrency must not exceed the cgroup CPU limit (`/sys/fs/cgroup/cpu.max`, often 2 even when `nproc` says 8); `render.sh` reads it.
- To fix one part, delete only the affected chunks (`out/chunks/cN.mp4` = second N) and re-run.
- `show_file` refuses files over 25 MB; `render.sh` also writes a `-share.mp4` at ~7 Mbit/s. For flat, graphic videos the CRF-18 master is often *smaller* (claude2video: 9.8 MB vs 16 MB) — send whichever is smaller.
- A 20 s, 600-frame render takes ~8 min at concurrency 2. If a tool call dies (exit 137), first check `out/chunks` and the timestamps of `out/*.mp4` — it may already be complete.
