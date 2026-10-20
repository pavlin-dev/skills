---
name: marketing-strategy
description: How to think like a marketer before making any marketing content for a B2B or B2C product - positioning (who it is for, what it beats), buying situations people are in when they need it, awareness levels, choosing the channel and voice, finding something new to say, and a repeating cycle of hypothesis, content, measurement and lessons kept in a strategy file. Use whenever the user wants marketing to be "smarter", "targeted", "less of a routine", asks for a marketing strategy, plan, content calendar or positioning, sets up automated or recurring marketing for a product, asks what to post next, or asks why marketing isn't working. Run it before `marketing-content` and the video skills when there is no strategy file for the product yet, and at the start of every recurring marketing run.
---

# Marketing strategy

Making content is the cheap part now. What makes marketing work is the decisions around it: **who is it for, what situation are they in, what do we say that nobody else says, where do they pay attention, and how do we find out if it worked**. A routine that produces posts without these decisions produces generic content, and generic content is what audiences and platforms are learning to ignore.

This skill makes those decisions, writes them into a strategy file, and turns every piece of content into a small test whose result goes back into the file. `marketing-content` and the video skills in this repository then build each piece.

## The core facts behind it

These are the research findings the rest of the skill rests on. Know them; they decide most arguments.

- **Most B2B buyers are not buying right now.** Ehrenberg-Bass research for the LinkedIn B2B Institute ("95-5 rule"): only around 5 % of potential business buyers are in the market in a given quarter. The job of marketing is to be the name they remember *when* the need comes, not to push the 5 % today.
- **Buying starts in memory, triggered by a situation.** Jenni Romaniuk's *category entry points*: buyers recall brands linked to the situation they are in ("a new hire starts", "the audit is next month", "the spreadsheet broke"). They are situations, not features.
- **Brand building and activation both matter, on different clocks.** Binet & Field: brand-building effects pay off over years, activation over weeks. Published B2B splits are around half and half (figures differ between sources); consumer brands lean more to brand building (roughly 60/40).
- **Buyers decide without you.** Gartner: most B2B buyers prefer to buy without a sales rep and spend only a small share of the buying time with suppliers. A growing share builds the shortlist by asking AI assistants, which cite brands that independent sources describe clearly.
- **People want insight, not pitches.** Edelman-LinkedIn thought-leadership reports: decision makers and the "hidden" people who influence a purchase read expert content regularly, and good content makes them more open to a vendor. Bold, opinionated content helps challengers most.
- **New information wins over well-written repetition.** When anyone can generate a fluent article, the only thing that stands out is what the author has and others don't: own data, first-hand experience, real cases. Platforms punish the opposite: YouTube demonetizes "inauthentic", mass-produced content and judges whole channels; TikTok removes unoriginal content from recommendations.

How solid this is: the 95-5 rule, category entry points and the brand/activation balance come from published research. The rest is consistent practice across many sources, and many specific percentages about AI search and LinkedIn reach come from vendors. Treat them as direction, not as numbers to quote.

## 1. Write the strategy file first

Every product gets one strategy file, kept where the user keeps project docs (ask; a natural place is `marketing/strategy.md` in the product's repository). Start from [`strategy-template.md`](strategy-template.md) in this skill's folder. Every marketing run reads it first and writes lessons back into it, so the system gets smarter over time instead of repeating itself.

Fill it from evidence, not imagination: use the product, read its pages, its reviews, support questions, community threads where its users talk, competitors' pages. Where you have to guess, write the guess as a hypothesis and say so. **The positioning section needs the user's confirmation**; don't run marketing on a positioning they haven't seen.

### Positioning (April Dunford's components)

1. **Competitive alternatives**: what would the customer do if the product didn't exist? Often not a competitor but a spreadsheet, an intern, a manual process, or doing nothing.
2. **Unique attributes**: what the product has that the alternatives don't.
3. **Value**: what those attributes give the customer, in their terms (time, money, risk, status, a fun moment).
4. **Best-fit customers**: the group that cares about that value most. Narrow: a role in a company type with a specific pain, not "SMBs" or "everyone who writes".
5. **Market category**: the frame that makes the value obvious ("a rhyme dictionary", "an expense tool for agencies").

If you can't fill a component, stop and ask: content without positioning is what makes marketing feel like a routine.

### Buying situations (category entry points)

List 5-10 concrete situations in which the best-fit customer suddenly needs what the product does. Good: "a client asks for the invoice in a format we don't have", "Friday evening, the birthday is tomorrow and there's no gift". Bad: "wants to save time", "needs better analytics" (too vague), "uses the export feature" (a feature, not a situation). Mark which 2-3 are the most common and where the product is strongest; content concentrates on those and repeats them for months, so the product becomes *the* name linked to them.

### Awareness levels (Eugene Schwartz)

The same person needs different content depending on what they already know:

| Level | They know | What works |
|---|---|---|
| Unaware | not even the problem | a story or observation that makes the problem visible |
| Problem aware | the pain, not the solutions | naming the pain in their words, how people deal with it |
| Solution aware | that tools like this exist | how to choose, what to watch out for, honest comparisons |
| Product aware | your product | proof, real cases, objections answered, pricing clarity |
| Most aware | they want it | the offer, the news, a reason to act now |

Automated marketing almost always writes for "product aware" ("our product does X"), which is the smallest group. Most content should serve problem-aware and solution-aware people; the product appears as the obvious next step, not as the topic.

### Point of view

Write down 2-4 opinions the product stands for that a reasonable person could disagree with ("most onboarding docs are written for the company, not the new hire"). Content without a claim someone could disagree with doesn't get shared and doesn't get remembered.

### Raw material: what only we have

List the sources of new information the content will be made from:

- data from the product (usage patterns, aggregated and anonymized, never personal data),
- real customer questions, complaints, support tickets, sales-call objections (with permission and anonymized),
- the maker's own decisions, mistakes, numbers and behind-the-scenes,
- real cases and results the user can confirm.

**Every piece of content uses at least one item from this list.** If a run has no new raw material, it says so and asks for some, rather than producing another generic post. This is the main difference between a marketer and a content routine.

## 2. B2B or B2C: what changes

| | B2B (most products here) | B2C |
|---|---|---|
| Who | a narrow best-fit segment, several people in a buying group | broad: everyone in the category, mostly light and new buyers (Byron Sharp) |
| Voice | a person (the founder or maker), their name and opinion | the brand, with consistent distinctive assets: same colours, tone, characters, sound |
| Content | insight, data, opinion, honest comparisons, help for the buying decision | stories, emotion, entertainment, situations people recognise; the user's story format (`marketing-storytelling-video`) fits best |
| Channels | where the role reads: LinkedIn (personal profile, not the company page), newsletters, podcasts, communities, being cited in AI answers | short video (Reels, Shorts, TikTok), Instagram, communities around the hobby or need |
| Clock | months to years; one buyer per many readers | faster, but brand memory still needs months of consistency |

Small products start narrow even in B2C: the broad-reach advice is for products people already know. Get one segment to love it first.

## 3. Choose channels deliberately

- **Find where the best-fit customer already pays attention**: which subreddits, newsletters, podcasts, YouTube channels, LinkedIn voices, Discord or Slack groups. Look at what they actually read and follow (communities, comment sections, who they quote), not what a survey would say.
- **Test a few, then focus** (the Bullseye method from *Traction*): pick 2-3 promising channels, run small tests for a few weeks, then put most of the effort into the one that brings real customers. Don't spread a small effort over five networks. Revisit the choice every few months; the channel that worked first is not always the one that works next.
- **Make content native to the channel and valuable without a click** (Amanda Natividad's zero-click content): the post itself teaches, shows or entertains; the link is optional. Platforms tend to show link posts less.
- **Communities are for listening and genuine participation, not automated posting.** On Reddit and similar communities, automate only the listening (what people ask, in which words, about which alternatives). Posts and replies are written or approved by the person whose account it is, follow each community's self-promotion rules, and disclose the connection to the product.
- **Be quotable for AI assistants and independent sources** (B2B especially): describe the product the same way everywhere, keep clear one-sentence answers (what it is, for whom, price, how it differs) on its own pages, and earn mentions in places buyers trust (reviews, comparisons, articles by others). Check now and then by asking a few assistants the questions a buyer would ask and noting whether and how the product appears.

## 4. The cycle: every run is a test

A recurring marketing run (a weekly routine, a scheduled task, or a user asking "what should we post") goes like this:

1. **Read the strategy file**, including the lessons log.
2. **Gather new raw material** since the last run (product data, new questions, the user's notes). If there is none, ask for it or pick an item still unused from the list.
3. **Write a hypothesis** for each piece: "*For <segment> in <buying situation>, at <awareness level>, <this angle / hook / format> on <channel> will <measurable result>*." One variable per test, otherwise nothing is learned.
4. **Answer the six questions** (below). If any answer is weak, change the piece or drop it.
5. **Make it** with `marketing-content` (research, true claims, review as the audience) and the video skills for video. Vary hooks, formats and visuals between pieces; repetition of the *situation and the brand* is good, repetition of the *template* is what platforms penalise as mass-produced.
6. **Hand it over for approval** where it matters (see below), with the hypothesis attached.
7. **Measure after a fixed time** (two to four weeks for most B2B signals; a week can be enough for short video in B2C) and **write the lesson** into the strategy file: what was tested, what happened, what to do differently. Kill what doesn't work, double what does.

### The six questions (mandatory before making a piece)

1. **Who exactly, and in which buying situation?**
2. **At which awareness level, and does the piece talk to that level?**
3. **What is new in it?** Which item of raw material does it use that a competitor or a chatbot could not write?
4. **What is the point of view?** Could someone disagree?
5. **Brand or activation?** Is it building memory (measured slowly, by reach to the right people, branded searches, mentions) or asking for an action now (measured by sign-ups)? Don't judge one by the other's metric.
6. **Right channel and right voice?** Is this where the segment pays attention, and should it come from the person or the brand?

## 5. Measure what can be measured, honestly

- **Pick the metric before publishing.** Likes and views are a weak signal; sign-ups, replies from the right people, demo requests, newsletter subscribers and saves are stronger.
- **Tag links** (UTM parameters or the platform's equivalent) so sign-ups can be traced to a channel and, if possible, a piece.
- **Ask people where they heard about the product**: a free-text "How did you hear about us?" at sign-up catches what links never will. In B2B, much of the decision happens in private channels (colleagues, Slack groups, messages) that no tracking sees.
- **Watch slow signals for brand building**: searches for the product's name, direct visits, mentions, being named by AI assistants.
- **Small numbers lie.** With a few sign-ups a week, don't draw conclusions from one post; look at trends over several weeks and say how sure you are. If the product has no analytics at all, say so and propose the minimum (sign-up source field plus tagged links) before optimising anything.

## 6. Where a human must decide

Automate the research, drafting, variation and measurement. Keep these with the user:

- **Positioning, point of view and the segment**: the user confirms them, and re-confirms when the lessons suggest a change.
- **Anything posted under a person's name** (founder posts on LinkedIn or X) and **anything in a community** (Reddit, forums, groups): the person approves or writes it.
- **Claims about customers, numbers and cases**: the user confirms they are true and may be published.
- **Spending money** (ads, sponsorships).

Content under the brand that follows a proven pattern (for example a story video format that already worked) can run with lighter review, but still with the review pass of `marketing-content`.

## Common traps

- **Content as the goal.** "Three posts a week" is not a strategy; "become the name agencies think of when an invoice is rejected" is.
- **Talking to the 5 % only.** Every piece is a call to action or a feature list. Most of the market isn't ready; give them something to remember.
- **Generic AI content.** Fluent, correct and indistinguishable from a thousand other posts. If the piece could be about any product in the category, it is not done.
- **Changing everything every week.** Memory needs repetition: the same situations, the same voice, the same distinctive look, over months.
- **One template mass-produced.** Platforms judge whole channels; a channel full of near-identical videos risks reach and monetisation.
- **Optimising for likes.** Reach among the wrong people is worth nothing; a post with 40 views from the right ten companies can be the best one of the month.
- **Spreading thin.** Five channels with a little effort each usually lose to one channel done well.
- **Automated community posting.** It gets accounts banned and burns the brand's reputation in exactly the places where trust matters most.

## Sources

- Ehrenberg-Bass / LinkedIn B2B Institute, the 95-5 rule: https://business.linkedin.com/advertise/resources/b2b-institute/b2b-research/trends/95-5-rule
- Jenni Romaniuk, Category Entry Points in a B2B world: https://business.linkedin.com/content/dam/lem/business/en/advertise/resources/b2b-institute/b2bi-cepinb2b-final.pdf
- Binet & Field, B2B effectiveness (WARC): https://www.warc.com/content/article/the-5-principles-of-growth-in-b2b-marketing-empirical-observations-on-b2b-effectiveness/en-gb/136353
- April Dunford, *Obviously Awesome* (positioning)
- Eugene Schwartz, *Breakthrough Advertising* (awareness levels)
- Byron Sharp, *How Brands Grow*
- Gabriel Weinberg and Justin Mares, *Traction* (Bullseye)
- Gartner, B2B buyers prefer a rep-free experience (2026): https://www.gartner.com/en/newsroom/press-releases/2026-03-09-gartner-sales-survey-finds-67-percent-of-b2b-buyers-prefer-a-rep-free-experience
- Edelman-LinkedIn B2B Thought Leadership Impact Report 2025: https://www.edelman.com/sites/g/files/aatuss191/files/2025-07/2025%20Edelman-LinkedIn%20B2B%20Thought%20Leadership%20Impact%20Report_FINAL.pdf
- Animalz, information gain: https://www.animalz.co/blog/information-gain
