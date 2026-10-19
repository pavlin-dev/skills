# Product footage

## Clean 3D footage of a web scene

`scripts/rec3d.mjs` opens a Turbl/three.js scene in headless Chromium, freezes time, sets a scripted camera per frame and saves 1080×1920 JPEGs (config JSON: `out`, `shots[{name, frames, keys:[{pos, look, fov}], ease, build}]`, optional `buildFn` to animate the scene assembling). Software rendering is slow (~3 s/frame), so record only what you need. Existing Padel Pro shots: `/workspace/persistent/turbl-padel-20s/public/pp_*.mp4`.

## Real website footage (web tools, SaaS)

`scripts/capture_site.mjs` drives the live site in headless Chromium at 720×1280 CSS px with DPR 2.25 → 1620×2880 PNGs (crisp up to 1.5× zoom on a 1080×1920 frame). Config steps: `shot`, `upload` (into `input[type=file]`), `click` (regex on button text), `waitText`, `scroll`, `rect` (element position in CSS px → `rects.json`), `burst` (screenshot every ~150 ms until a text appears, records the % shown). Copy it into `<project>/tools/` next to a `node_modules` symlink to `/workspace/turbl-reel-v2/tools/node_modules` (puppeteer-core).

- Read the site first (`browser text`, `browser links`, CSS variables for brand colours, the logo SVG, example videos it hosts) and take every claim from it.
- Run the real flow with a small test input you make yourself (e.g. a tiny animation file). It shows up in the product's counters/history — tell the user.
- **Stay on the free path.** Changing options can switch to a paid mode (claude2video: 60 fps/1080p → "Render for $0.02"); never click a paid button.
- Fonts: headless Linux renders `system-ui` as DejaVu, which looks off. The script overrides the site's font CSS variables with Geist via data-URI `@font-face`; check which variables the site uses (`--sans`, `--mono`, …).
- In Remotion show screenshots through a camera: `Shot({src, cam: {cx, cy, k}})` puts CSS point (cx, cy) at the box centre with k output px per CSS px (k ≈ 1.45 fills a 980 px wide window; zoom to ~1.7 on the button being clicked). Put them in a browser-window frame (traffic lights + URL pill), page changes slide up from below.
- Don't fake UI states: for progress, show the real captured states one per half-beat (with a tick sound each). Overlay the real output video (download it from the player's `currentSrc`) at the player's `rect` so the result actually plays.
- Use the motif as the pointer (dot moves on an arc, presses on the beat with a ring ripple) instead of a system cursor.
