---
name: marketing-content
description: How to make marketing content for a product or service, such as social posts (Reddit, Instagram, Facebook, LinkedIn, X), promo images and banners, ad copy, marketing videos, newsletters, landing-page sections, that is true, clear and fits the platform, and how to review it as the audience before handing it over. Use whenever the user asks for marketing, promo, advertising or social-media content, a post or image "about <product/website>", or wants existing marketing material improved. For marketing videos (YouTube, Shorts, Reels, TikTok) the default format is a user's story, see `marketing-storytelling-video`.
---

# Marketing content

Marketing content works when a stranger understands in a few seconds what it is, why it matters to them, and what to do next, and nothing in it makes them doubt it. Most failures are not "bad design" but small things: a number nobody can read, a slogan that only makes sense to the author, a claim the product doesn't support, a format that doesn't fit the platform.

This skill decides *what* to say and checks the result; the video skills in this repository say how to build it.

## Marketing videos: a story by default

Every marketing video (YouTube, Shorts, Reels, TikTok, a promo for a website or app) is made as a **marketing story** unless the user asks for something else: a user of the product tells what happened to them, and the product appears only as the tool they used when they were stuck. No slogans, no feature list, no end card with logo and URL. Follow `marketing-storytelling-video` for the story and `voice-over` for the narration.

Make a **classic promo** (the product as the topic: hook, features, call to action; built with `engaging-video` or `motion-design-video`) only when:

- the user asks for an ad, a promo, a teaser or a feature demo in that style, or
- the content is news about the product itself (a launch, a new feature, a price change), a tutorial or a how-to, or
- it is a paid retargeting ad for people who already know the product.

If unsure, make the story and mention in one line that a classic promo is the alternative.

## 1. Research before writing

- **Use the product once** (open the site, try the main feature) and collect real material: what it does, actual results/screens, numbers, the product's own slogan and wording, brand colours (page CSS), logo.
- **Every claim comes from the product's own pages.** Write down where each one came from (page URL). Compute numbers carefully (pages × items per page, and check the last page). Never invent "free", "AI", ratings, user counts or testimonials. If a claim can't be verified, leave it out or ask.
- **Who is it for and where will it run?** Ask if unclear. The platform decides format and tone:
  - Reddit: communities dislike ads. A post from a real person ("I built…", a question, something useful) with the visual as support works; a pure ad gets removed. Check the subreddit's self-promotion rules before suggesting where to post.
  - Instagram/TikTok/Shorts: vertical 1080×1920 video or 1080×1350 image, text big enough on a phone, nothing important at the top ~130 px and bottom ~350 px (UI overlays).
  - LinkedIn/Facebook/X: the first line of the text decides whether anyone reads on; images 1200×1200 or 1080×1350 fit most feeds.
  - Videos in feeds autoplay muted: the story must work without sound.

## 2. Make it

- **One message per piece.** One product, one benefit, one action. A second feature is a second post.
- **Hook first.** The first line / first frame says what it is and why the viewer should care (a question they'd ask, a concrete result, a surprise from the product itself).
- **Show, don't describe.** Real output of the product (an actual search result, a real screen) beats adjectives. Illustrations are fine when they are clearly illustrations and don't pretend to be real data.
- **The viewer's words, not the maker's.** Short sentences, no jargon, no internal names. Language of the audience (Czech product → Czech text with correct typography: „…“ quotes, non-breaking spaces where needed).
- **Clear call to action**: what to do and where (URL, button text from the product).
- **Licensed assets only.** Music: an existing licensed track or one from a music generator, never self-synthesized (see `engaging-video`); tell the user the source and the licence (e.g. CC BY needs attribution in the post). Images/fonts: own renders, the product's own assets, or properly licensed ones. Never imitate another brand.

## 3. Review it as the audience: at least one full iteration (mandatory)

After the first version exists, stop being the author. Look at the finished output itself (the rendered image, frames of the final video, the text as it will appear), not at your code or plan, and go through it as a person who has never heard of the product and scrolls past in a hurry:

1. **Is everything easy to understand?**
   - In 3 seconds: what is it, for whom, what do I get? Say it in one sentence; if you can't, the piece isn't clear.
   - Can every word, number and icon be understood without explanation? (Unlabelled numbers next to items: are those ratings, counts, prices? A caption that only makes sense with the previous frame?)
   - Is the text readable at the real size (phone, feed thumbnail) and long enough on screen to read (≈ 3 words per second)?
2. **Is anything weird?**
   - Odd or clumsy wording, a joke or poem that falls flat, wrong typography (straight quotes in Czech, missing diacritics), typos.
   - Visual glitches: overlapping or cut-off text, elements covering each other, empty or black frames, something flat on top of a 3D scene, stray half-visible shapes, too much going on at once.
   - Things that look fake or misleading: invented UI, combined claims that the product doesn't promise together, numbers without a source.
   - Anything that could embarrass the brand or annoy the community (pure ad on Reddit, clickbait, wrong tone).
3. **Fix what you found, then check the changed output again.** One pass is the minimum, not the goal: repeat until a pass finds nothing worth fixing.
4. **Tell the user honestly** what you checked and how (stills, contact sheet, text), what you could not check (e.g. you cannot listen to audio or watch real-time motion), which parts are illustrations, and where each claim came from.

If you can delegate, a fresh reviewer without your context (a subagent that gets only the output and "you are a viewer who has never seen this product") is the strongest version of this pass.

## Lessons from real projects

- A square video was made although the skill said vertical; the user wanted vertical. Follow the format the skill or user names.
- Unlabelled numbers taken from a site (ratings next to rhymes) puzzled viewers; label them or drop them.
- "Playlists for the whole team" merged two separate features into one promise; keep claims as the product states them.
- Self-written verse in a promo was the weakest part; real content from the product is more convincing.
- Music chosen by guessing was rejected four times ("kids' game", "dated", "generic"); ask the user for a track first.
