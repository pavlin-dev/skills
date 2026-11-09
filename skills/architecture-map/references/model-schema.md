# Model format

`scripts/build.mjs` takes one JSON file. Either a single project, or a page with several projects (the page then shows a switch between them):

```json
{
  "title": "Updater architecture",
  "lead": "One or two sentences on top of the page.",
  "lang": "en",
  "ui": { "open": "click = inside" },
  "projects": [ { "name": "Updater", "mods": [], "io": [], "svc": [], "flows": [], "uses": [], "scen": [] } ]
}
```

Two complete, working examples ship with the skill (texts are Czech, the system is a song crawler):

- `references/example-updater.json`: a chain of three parts, one optional input, one output that is not built yet, two services (one shared by two parts), four examples.
- `references/example-branching.json`: six parts with a fan-out and fan-in (one part routes work to four others, all four report to one part). Use it to see how the layout copes with branching.

## Project

| Field | What it is |
|---|---|
| `name` | The system's name, shown on its boundary and in the breadcrumb. |
| `mods` | The system's own parts (2 to 7). |
| `io` | Inputs and outputs: who sends work in, who gets the results. |
| `svc` | Services the parts call and get an answer from (an AI API, a parser, a payment provider). |
| `flows` | The main flow: arrows between io and parts, and between parts. |
| `uses` | Calls from a part to a service: one quiet two-way arrow each. |
| `scen` | Examples played on the map (optional, but strongly recommended). |

### `mods`: parts

```json
{ "id": "orders", "n": "Orders", "d": "Responsible for turning a cart into a confirmed order.",
  "line": [["Order received", "← web shop"],
           ["Stock check", "items still available?"],
           ["Payment", "⇄ payment provider"],
           ["Result", "a paid order ready to ship"]] }
```

- `n`: plain name a newcomer understands. Not a folder, class or package name.
- `d`: one sentence, "Responsible for …" (Czech: "Má na starost …"), about this part's own job only.
- `line`: 2 to 6 steps shown inside the part after a click, drawn as a metro line. Each step is `[name, note]`. The last step is the part's **result** (what it produces), not "hand over to X". Mark a service call in the note with `⇄`, something coming in with `←`, going out with `→`.

### `io`: inputs and outputs

```json
{ "id": "shop", "n": "Web shop", "note": "input", "kind": "in" }
{ "id": "wms", "n": "Warehouse system", "note": "output · coming soon", "kind": "out", "soon": true }
```

- `kind`: `in` or `out`. An io box may have flows to several parts (one client app calling several parts). If it asks and gets an answer back, use `two` flows. If it sends in one place and receives somewhere else, make two boxes.
- `opt`: the system works without it (dotted border). `soon`: not built yet (dashed, amber).

### `svc`: services

```json
{ "id": "pay", "n": "Payment provider" }
```

One box per service, even when several parts use it; the page marks it "shared".

### `flows`

`[from, to, word, kind]`, kind is `main` (default), `opt` (dotted, from an optional input), `soon` (dashed, not built yet) `async` (dashed one-way hand-off through a queue, a schedule or shared storage) or `two` (one two-way arrow for a request and its answer, word written `request / answer`; use it for clients of a request/response system, e.g. `["app", "orders", "order / status", "two"]`).

```json
["shop", "orders", "order"], ["orders", "shipping", "paid order"], ["shipping", "wms", "parcel", "soon"]
```

The word is a noun for what travels, one word if you can, two at most.

### `uses`

`[part, service, request, answer]`. Drawn as one thin two-way arrow labelled `request / answer`.

```json
["orders", "pay", "card", "result"]
```

### `scen`: examples

`[title, steps]`. A step is `[from, to, payload, caption]` along an existing arrow (a flow, or a use in either direction), or `["at", partId, payload, caption]` for something that happens inside a part (work that starts there, or the end of the story).

```json
["Card declined", [
  ["shop", "orders", "#1042: 2 × T-shirt", "A customer places an order."],
  ["orders", "pay", "card **** 4242", "Orders asks the payment provider to charge the card."],
  ["pay", "orders", "declined", "The bank declines."],
  ["at", "orders", "#1042 unpaid", "The order waits for another payment; nothing goes to shipping."]]]
```

- `payload`: a concrete, real-looking value (an order number, a URL, a file name, a score). When the payload changes at a part, the old label stays parked where it arrived and the new one comes out, so readers see what went in and what came out.
- `caption`: one short sentence.

## `ui`: page texts

Defaults are Czech. Override any of them for another language:

```json
"ui": { "open": "click = inside", "service": "service", "shared": "shared", "example": "Example",
        "project": "Project", "hint": "Play an example to see where it starts and where it goes.",
        "end": "end", "back": "click a part", "parts": "parts", "stats": false }
```

`stats: false` hides the line under the map with the layout numbers (keep it on while you iterate).
