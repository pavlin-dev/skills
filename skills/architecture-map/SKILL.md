---
name: architecture-map
description: Principles and rules for drawing the architecture of one software system as a picture a person understands at first glance - its few main parts with one sentence each, the outside world (who sends work in, who gets results, which services it calls), one word on every arrow for what travels, zooming into a part, and concrete examples moving through it. Use when the user asks for an architecture diagram, overview or map of a project, wants to see or show how a system is built, or wants a design reviewed visually. Not for questions a short text answer settles. Ships an optional engine that computes such a map from a JSON model.
---

# Architecture map

**Goal:** someone who has never seen the code looks at the picture and, within seconds, knows what the system's parts are, what each one is for, what comes in, what goes out, what it relies on and what travels between the parts.

The rules below come from many rounds of a real user rejecting diagrams. Each one fixes a way architecture pictures fail. **The rules are the skill;** any drawing tool can produce the result. The examples in the rules come from different kinds of systems (a shop, a chat app, a data pipeline, a content crawler) and only illustrate.

Two kinds of guidance follow: **principles** (break them and the picture stops working) and **default style** (what the user liked; change it if your user wants something else).

## Principles

### What goes on the picture

1. **One system per picture, seen from above.** Systems it talks to (a mobile app, a payment provider, another team's service) are single boxes. Never draw their insides.
2. **The few biggest parts of one level.** Each part is a responsibility (orders, payments, notifications). Together the parts cover the whole system and no two share a subject. Around 3 to 7; with more, the level is too detailed, so group them. If you leave out a real but minor responsibility, name it in a line under the picture, so "covers the whole system" stays true.
3. **Parts are modules, not steps or decisions.** "Validate address" or "Is it spam?" are steps inside some part. If a box would be a verb or a question, it is not a part.
4. **Architecture, not code layout.** Leave out folders, admin screens, start-up code, shared helpers, configuration, monitoring, feature flags and service discovery unless they are a real responsibility the design talks about. If such plumbing matters operationally ("when the registry is down, parsing stops"), say it in words. Don't add a box for a concept nobody mentioned when describing the system: a new concept on the picture reads as a new part of the design.
5. **One sentence per part, about its own job only:** "Responsible for …". No second sentence about what it does *not* do, never another part's job. Keep the sentence visible when the part is opened.
6. **Names the reader already uses.** Not code identifiers (`OrderSvcImpl`, `ingest`, `admission`) and not invented roles ("Publisher" when the team says "the backend"). Outside systems keep the name the team uses for them, even if it is jargon, as long as it is not a class or package name. If a word needs the code to make sense, replace it.
7. **No implementation details:** no HTTP verbs, endpoints, queue or table names, file names, versions, counts. They don't explain the architecture.

### Making the parts read as separate

8. **Each part is its own clearly bounded area** inside one strong boundary that says "this is the system".
9. **Don't line the parts up in one row.** A row reads as one pipeline instead of separate modules, and arrows between non-neighbours run through the parts in between. Spread the parts in two dimensions with connected parts next to each other.
10. **The first view shows only the parts and the world.** What is inside a part appears when the reader asks for it (click, zoom, a second picture). Showing everything at once overloads the first glance.
11. **Give the eye a starting point:** where work comes from.

### The world around the system

12. **Three kinds of outside boxes, each with its own look:**
    - **who sends work in** (users' apps, other systems, a schedule). If the system also runs without it, mark it *optional*.
    - **who gets results** (a database owned by someone else, another service, a user). Mark one that does not exist yet *coming soon*. In a request/response system the answer goes back on the client's own arrow (rule 17), so outputs are only side effects that reach someone else: e-mails, notifications, exports.
    - **services** the parts call and get an answer from (payment provider, email sender, an AI API, a search index). These are helpers: draw them quieter than inputs and outputs.
13. **One box per outside system,** even when several parts use it or one client app calls several parts, placed close to all of them, with an arrow to each part it talks to. Split a client into boxes per kind of user ("customer", "warehouse staff") only when the roles use different parts, and say under the picture that it is one app.
14. **Things a part fetches by itself belong to that part.** If a part crawls websites or polls a feed as part of its own job, show that inside the part, not as another top-level input next to the real ones.

### Arrows

15. **Arrows are required.** Without them the parts float and the reader cannot tell what connects to what.
16. **An arrow says what travels, in one word** (a noun: "order", "payment", "message", "invoice"). Two words at most.
17. **Request/answer pairs are one two-way arrow** labelled `request / answer` ("order / confirmation", "card / payment result"). Two parallel arrows pull too much attention. This covers calls to services and, in request/response systems, the clients calling the system.
18. **A hand-off through a queue, a schedule or shared storage is a one-way arrow drawn dashed** ("song" handed to background sorting), not a request/answer pair: the sender does not wait. If results come back later the same way, that is a second dashed arrow.
19. **A part every other part relies on** (sign-in, permissions, a shared catalogue) keeps only its own arrows to the outside; its sentence says that the others rely on it. Don't draw an arrow from every part to it.
20. **Draw what travels, not code dependencies.** Readers found "who imports whom" pictures, dependency directions and "should not depend on" warnings confusing. Code coupling is a review topic for words (rule 29), not for this picture.
21. **Arrows stay in the background:** short, thin, bending at right angles, never through another box, never on top of or hugging each other, using the free space between boxes.

### Inside a part

22. **Zoom in, don't switch pictures.** The part grows to fill the view, its neighbours slide away, a breadcrumb leads back.
23. **If the part has real sub-modules** (each a responsibility, not a step), the inside is the next level of the same kind of picture: the same rules, with the part's neighbours as outside boxes.
24. **If the inside is a procedure,** show it as a short line of 2 to 6 steps, not as boxes (boxes look like modules you could click into) and not as a paragraph (nobody reads it). If work enters the part in two ways, the first step names both ("Order from the shop or the app").
25. **The line ends with the part's result** ("order ready to ship", "message stored"), not "hands it to X". What happens next is another part's job.
26. Mark at a step where a service is called or something arrives.

### Concrete examples

27. **Add 2 to 4 examples that send one concrete thing through the system.** Words on arrows explain the structure; a concrete run explains how it works ("order #1042: 2 × T-shirt" → "card / approved" → "parcel label CZ1234").
    - Start each example where that work really starts: an input, or inside a part for work the system starts itself (a nightly job, a retry, a re-check). Readers ask "where does it begin?".
    - Include one that stops early or fails (payment declined, duplicate ignored, nothing changed).
    - When what travels changes at a part, keep the old thing visible where it arrived and show the new thing leaving, so the reader sees in and out.
    - About 6 steps per example; split a longer story into two examples. One short caption per step, no dead pauses. The path taken stays highlighted.

### Honesty

28. **Use the reader's language,** in labels as well as captions.
29. **The picture shows the intended design. It cannot prove the parts are isolated.** A flow picture looks clean even over tangled code. Check the code separately (who imports whom between parts, which part owns which data). If it disagrees with the picture, tell the user plainly in words and say what would fix it. Never draw a cleaner picture and present it as the code.

## Default style

The user who shaped these rules liked the following. Use them unless your user prefers otherwise:

- one soft colour per part; outside boxes grey, inputs and outputs white with a dark border; optional = dotted, coming soon = dashed amber;
- small rings where an arrow meets a box ("plugged in");
- main-flow arrows in the accent colour, service arrows grey and thinner;
- the procedure inside a part as a metro line (stations with a short note), the last station filled;
- examples as a coloured label gliding along the arrows, the rest of the map dimmed.

## Approaches that failed

| Approach | Why it failed |
|---|---|
| Nested boxes without arrows | Parts float, no starting point, nothing to follow. |
| One row of stages | Reads as a pipeline, hides whether parts are separate, arrows cross parts. |
| All logic drawn as boxes | Steps look like modules; logic and architecture mixed. |
| Circular or hub layout | Confusing, no starting point. |
| Sequence or timeline diagram | Hard to read and fits only linear systems. |
| Per-part cards ("takes / gives / uses") or a contract view | Does not read as architecture. |
| Chat or conversation per part | Clever, but explains nothing about structure. |
| Dependency matrix, import counts, "who knows whom", layer or floor views of allowed dependencies | Code structure, not architecture; numbers mean nothing to the reader. |
| One service drawn as a long bar under all its users, or one copy per user | Long lines, or the same system shown twice. |
| Two parallel arrows for request and answer | Too heavy. |
| Paragraphs of text inside a part | Not read. |

## Working with the user

- **Read the code before drawing:** entry points, scheduled jobs, every outside call (HTTP clients, SDKs, environment variables with URLs or keys), and what each module produces. In a large repository let a sub-agent collect this.
- **Kinds of systems.**
  - Pipelines (data comes in, gets processed, goes out) map directly.
  - Request/response systems (a typical backend): parts are the domain areas; each client app is one input with a two-way arrow to every part it calls ("order / status"); outputs are side effects only (rule 12); the database stays inside the parts that own the data; sign-in is a part the others rely on (rule 19).
  - Event-driven systems and background jobs: the events are the words on dashed arrows (rule 18).
  - Live relays (websockets, chat): the relaying part gets one two-way arrow per kind of client ("slide / slide").
- **Propose several genuinely different variants early** (different ideas, not one idea in five layouts) and ask for feedback on each. Don't lock onto one solution; keep trying unconventional ideas until the user says it works.
- **Turn remarks into rules.** When the user says "this box is a step, not a module", fix it everywhere, not only where they pointed.
- **Look at your own picture before showing it:** overlapping labels, lines through boxes and unreadable text are what the user will notice first.
- **Say what is still weak** in each variant you present.

## Building the picture with the bundled engine

Optional. The engine implements the principles and the default style and lays out the picture automatically.

1. Write a model of the system as JSON (parts with their sentence and inner steps, inputs and outputs, services, flows, service calls, examples). Format: `references/model-schema.md`. Two working examples, both Czech: `references/example-updater.json` (a 3-part pipeline with a shared service, an optional input and an unbuilt output) and `references/example-branching.json` (6 parts, one part fanning out to four and back).
2. `node scripts/build.mjs model.json architecture.html` checks the model against the rules a script can check (unknown ids, example steps without an arrow, unused services, too many parts, long words and sentences) and writes a self-contained interactive page. `--fragment` leaves out `<html>`/`<head>`/`<body>` for hosts that add them.
3. `node scripts/check.mjs architecture.html [out-dir]` (needs Playwright, see `--help`) reports script errors and layout statistics and saves screenshots of the overview, every part zoomed in and every example.

Limits: up to 7 parts and about 14 outside boxes per picture; the inside of a part is drawn as a line (rule 24). For real sub-modules (rule 23) build a separate model for that part. How the layout is computed and tuned: `references/engine.md`.
