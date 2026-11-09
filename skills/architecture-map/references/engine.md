# The bundled engine

`template/engine.html` is a self-contained page (inline CSS and JS, Google Fonts with a system fallback, light and dark theme). `scripts/build.mjs` injects a model into it; don't edit it per project.

## What it does

- Draws the system boundary, one coloured tile per part (name and sentence), inputs, outputs and services outside.
- Click a part: the camera zooms into it and shows its inner line; the breadcrumb or a click on the background zooms out.
- Example buttons play a scenario: a label moves along the arrows, changes at parts (the old one stays parked), the taken path stays lit, a caption explains each step.
- Under the map: a stats line (time, candidates tried, grid chosen, places where lines meet). Hide it with `"ui": { "stats": false }`.

## How the layout is computed

1. **Placement.** Tries every grid shape with up to 6 empty cells (at most 4 columns or rows) and every assignment of parts to cells. Scores each by: distance between connected parts, diagonal neighbours, straight lines between connected parts that cross each other or pass over another part, inputs far from the left, outputs far from the right, users of a shared service far apart, a single row or column, and empty cells. Keeps the best two per grid shape.
2. **Outside boxes.** Slots exist above and below each column and left and right of each row, plus a second, outer ring used only when the first is full. Inputs take left/top slots, outputs right/bottom, services any side; each takes the free slot closest to all the parts it talks to (services with more users first).
3. **Routing.** A* on a 10 px lattice, right angles only. Boxes (with a margin) are obstacles. Costs: each step, each turn, running next to a box, running on or beside an earlier line. Each line tries the two sides of each box that face the other box.
4. **Choice.** Every kept candidate is fully routed; the winner has the fewest cells where lines meet, then the shortest total length and fewest turns, with a large penalty for a single row or column.
5. **Labels** go on the longest straight stretch of their line, at the first spot that is clear of other labels and boxes.

## Tuning

- Spacing: `W`, `H` (part size), `GAPX`, `GAPY` (gaps between parts), slot distances in `layout()`.
- Weights: the scores in `place()`, the costs in `makeRouter()` (`HUG`, turn cost, `used`, `soft`) and the final score in `solve()`.
- They were set by eye on a 3-part chain and a 6-part fan-out. If a new project lays out badly, first simplify the model (rules 2 and 16 in SKILL.md), then adjust weights in a copy and say so.

## Limits

- At most 7 parts (the placement search is exhaustive) and about 14 outside boxes; `build.mjs` refuses more.
- Arrow kinds: `main`, `opt` (dotted), `soon` (dashed amber), `async` (dashed accent, a hand-off that is not waited for), `two` (two-way). Service calls are always one quiet two-way arrow.
- During an example at most two used labels stay parked, so long runs don't bury the map.
- A fan-out to four or more parts and back usually leaves one to three places where lines meet.
- Page texts default to Czech; override them with `ui` (see `model-schema.md`).
