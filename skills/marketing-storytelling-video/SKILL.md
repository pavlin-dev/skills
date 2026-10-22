---
name: marketing-storytelling-video
description: Principles for marketing videos told as a story instead of an ad - a user of the product tells what happened to them, and the product (usually an app or website) only shows up as the tool they used at the moment they were stuck. Covers finding the moment of need, the character, the story beats, where and how the product appears, faceless execution with screens and voice-over, honesty and disclosure, and the review. This is the default format for marketing videos (YouTube, Shorts, Reels, TikTok): use it whenever the user asks for a marketing or promo video for a product, website or app, unless they ask for a classic ad, a feature demo or a launch announcement. Also use it when the user wants something that "doesn't look like an ad", storytelling/story-based marketing, a "story of a user", native or soft-sell content, or a video where the product is mentioned "by the way". This is the marketing variant; for stories that are not meant to promote anything, use the `storytelling-video` skill instead.
---

# Marketing storytelling videos

A classic promo says "our product does X". A marketing story says "this happened to me", and the product is the thing the person happened to use. People scroll past ads, but they watch a story to the end to see how it turns out. The product earns attention by being the turning point, not the topic.

This skill decides *what story to tell and where the product sits in it*. For the craft, also follow the other skills in this repository: `marketing-content` (research, true claims, review as the audience), `voice-over` (narration, Google Gemini TTS, timing captions to words), `sound-design` (levels of voice, music and effects, music cut to the story), `storytelling-video` (story structure, length, the pen-drawing style), and `engaging-video` / `motion-design-video` (building and rendering the video).

## The core rule

**The user is the hero, the product is the tool, the result belongs to the user.**

- The story is about a person who wants something and gets stuck.
- The product appears at the moment they are stuck, and gets them unstuck.
- The ending is what the person gained (a laugh, a hug, a finished thing, time saved), not praise for the product.
- If you can remove the product from the story and nothing changes, it is product placement, not a story. If the product is the topic of every scene, it is an ad.

## 1. Know the product and its limits

Research the product first (section 1 of `marketing-content`): use it, collect real outputs, note the exact names and wording. Then write down its **limits**, because the plot has to respect them:

- How long it takes (instant? a day? "delivered within 7 days"?), what it costs, whether it needs an account, which platforms it runs on, what it really outputs.
- Example: a custom-poem service that delivers within 7 days cannot rescue a "birthday is tomorrow" story. That plot would be a lie; the instant rhyme search can.

## 2. Find the moment of need

Don't start from a feature. Start from a situation in the target user's life where they need what the feature does, and where something is at stake.

- Ask: *who* uses this, *when* do they reach for it, and what goes wrong *just before*? The best moments have a deadline, a person they care about, and a small embarrassment or panic.
- Write 3-5 candidate situations, then pick by: is it common for this audience, is it specific enough to picture, does the product's real behaviour solve it, can it be shown on screens.
- Avoid the most obvious cliché if a fresher one is available (forgotten birthday works, but a school assignment due tomorrow, a wedding toast or a card for a colleague may compete less).
- One situation, one problem, one product moment per video.

## 3. The character and honesty

- The narrator is a **user of the product**, speaking in the first person, in the words such a person would use (colloquial, short, a little self-ironic). Not a presenter, not the company.
- Decide who the person is (age, gender, situation) before writing. Keep it consistent everywhere: verb forms in gendered languages (Czech "zapomněl"/"zapomněla"), captions, any visible names.
- **A made-up character is fine as a scene posted by the brand** (its own account or a paid ad, labelled by the platform). It is **not** fine to present a made-up person as a real, independent customer, to post from an account pretending to be one, or to invent reviews or testimonials. That is hidden advertising and fake endorsement. Paid creators must disclose the partnership.
- Everything the product does on screen is its real output (real search results, real UI). The character's own world (notes, chats, lock screen) can be mocked, but generic, not imitating another brand's app.

## 4. Story beats

For a 25-35 s vertical video (Shorts, Reels, TikTok; shorter is better, a 42 s first cut was too long on review). For a horizontal YouTube video (16:9) the same beats scale to 1-3 minutes: the struggle gets more room (two or three attempts that fail), the product still enters around the middle, and the hook still has to land in the first seconds.

| share of runtime | beat | what happens |
|---|---|---|
| 0-10 % | **Hook: stakes** | The problem and why it matters, readable on the very first frame ("Tomorrow is Bára's birthday. And I completely forgot."). No logo, no product. |
| 10-45 % | **Attempt and struggle** | The person tries on their own and it goes badly. A funny or painful detail makes it real. End on the stuck moment, with a beat of silence before the punchline ("…and what rhymes with love… *pause* nothing."). |
| 45-55 % | **Turn: the product** | One natural sentence names it ("So I opened Rýmovač."). The product's real screen appears. |
| 55-75 % | **Discovery** | The product gives the answer, and the person *recognises* it as theirs ("Brunette! Bára is a brunette!"). The aha belongs to the person, the product only supplied the options. |
| 75-100 % | **Payoff** | The result in the person's life: the finished thing, the reaction of the other person. End on that emotion. |

Rules for the product:

- **Name it once**, in a sentence the narrator would really say. Captions may highlight the name lightly.
- **No end card with logo, slogan, URL or call to action.** Viewers read that as "it was an ad after all", which undoes the story. End on the payoff.
- If the product's name or address should be findable, let it appear **where it naturally is**: the browser's address bar, the app's own header, a share sheet. The link goes in the post text, not in the video.
- A branded end card is an exception for paid ads, only when the user asks for it, and even then short.

## 5. Showing it without a face

Two executions work: screens only (below), or a 3D cartoon where simple round-head characters act the story out and the product appears on a phone, laptop or TV in the scene (the `toon-story-video` skill; more engaging, reviewed as "super").

Filming people is expensive and amateur footage often looks bad. A story works without faces when the viewer watches **the screens of the character's life**:

- One phone stays on screen the whole time as the hero element; scenes are app switches on that phone (lock screen with a notification → notes → the product → messages). Switches are motivated by the story, never plain cuts.
- Each screen shows the step of the story: the notification states the problem, typing and deleting shows the struggle, the product's real results show the discovery, a chat reply shows the payoff.
- Time and mood live in the surroundings: clock and dark colours at night, warm colours the next morning.
- Something must change on screen at least every ~3 s (typing, a highlight, a new message). A static screen held for 7-10 s felt dead on review.
- Voice-over carries the story, captions repeat it word for word (feeds autoplay muted). Follow the `voice-over` skill; the voice decides whether the video feels real or cheap.
- Music is a quiet bed under the voice (licensed, never self-made), not a beat to cut to.

## 6. Review as the audience

Do the review pass from `marketing-content` (section 3) on the rendered video, and add these questions:

- **Does any moment feel like an ad?** Slogans, feature lists, a product shot that lasts longer than the story needs, an end card. Remove it.
- **Without the product name in the caption, would a viewer still know what was used and where to find it?** If not, make the product's screen clearer, don't add a pitch.
- **Is the payoff about the person?** If the last thing on screen is the product, the story ends in the wrong place.
- **Is every product behaviour real** and does the plot fit its limits (time, price, login)?
- **Is the character honest?** Clearly the brand's scene, not a fake independent user.
- **Would you watch it to the end** if you didn't know the product? Cut whatever you would skip.

## Example: Rýmovač (Czech rhyme finder)

Situation: 23:58, a guy realises his girlfriend's birthday is tomorrow and he has no gift; he decides to write her a poem. Screens: lock screen with a calendar notification → notes app, he types "Moje milá Báro, ty jsi moje láska" and gets stuck on the rhyme ("…nic.") → Rýmovač in the browser (address bar `rymovac.cz`), he types "láska", real results: kráska, sázka, páska… tmavovláska, "Bára is a brunette!" → the finished poem in the notes → next morning he sends it, she replies "nejlepší dárek, co jsem kdy dostala". Voice-over in first person (Gemini TTS), captions synced to the words, quiet lo-fi bed. ~35 s. No end card.

What testing taught:

- The robotic voice was "the worst part"; a directed Gemini TTS voice was accepted.
- A logo/URL end card made the whole video feel like an ad again; the user removed it.
- The first cut was 42 s with a 10 s static lock screen; tightening the setup helped.
- The rhymes on screen were real results from the site, which made the turn believable.
