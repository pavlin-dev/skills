---
name: opportunity-signals
description: Step 1 of the `business-opportunities` skill - finding problems worth testing from signals people already left, without talking to anyone. Covers what a signal is and how to rate its strength (complained, spent effort, spent money), collecting signals with a quote and a link, grouping them into problems, the five-question filter, researching alternatives and how crowded the problem is, writing the case against, and handing over at most three candidate cards. Use when searching for business or product opportunities in an agreed area, when the user asks what signals of demand exist for a problem or how strong the evidence for an idea is, or when `business-opportunities` reaches step 1. If no search area has been agreed with the user yet, start with the `business-opportunities` skill.
---

# Opportunity signals

Step 1 of the three steps in the `business-opportunities` skill. Its question: **where do people already pay, in money or time, for something that bothers them?** The agent does it alone, with no contact with people, and it ends with at most three candidate cards.

Before starting:

- **The search area must be agreed with the user** and written in the opportunity file (who we look at, why the user can reach them, which sources). If it is not, do that first with `business-opportunities`; do not pick an area yourself and do not start from a product idea.
- **Read the opportunity file**, including the graveyard and the lessons, so you do not propose what was already killed.
- The shared rules of `business-opportunities` apply. The ones that matter most here: no source, no claim (a link and a literal quote for every signal, fact kept apart from inference), behaviour not opinions, and at most three candidates.

## What a signal is

A signal is a trace someone left by having the problem and doing something about it. You find it without talking to anyone. Its strength is what it cost the person:

| Strength | What the person did | Examples |
|---|---|---|
| Weak | complained | a post saying "this annoys me" |
| Medium | spent effort | asks how others handle it, built their own spreadsheet or script, wrote a long review, sells or shares a template |
| Strong | spent money | pays a competitor, hired a freelancer for it, a company advertises a job for it, repeated paid gigs for the same routine |

- One signal means nothing. A problem needs several **independent** signals (different people, different places) from the **same kind of person**.
- A signal proves the problem, not your solution. That people pay a competitor does not mean they will switch.
- Low-star reviews of paid tools are valuable: willingness to pay is already proven and the complaint tells you what is missing.
- No competitor at all is usually a bad sign (no market), not a good one.

## Where signals live

A general web search mostly returns articles and vendors' pages. Those are **context and evidence of crowding, not signals**: an article says a problem might exist, a vendor's page says someone already sells a solution. Use search to find the places below, then open the places themselves and read them through their own listings and search.

| Kind of place | What it shows | Usual strength |
|---|---|---|
| Request-for-quote portals, freelance boards, tenders | someone offering money for a job, often a recurring routine | strong |
| Job ads that describe a manual routine | a company paying a salary for it | strong |
| Low-star reviews of paid tools | payment is proven, the complaint says what is missing | strong |
| Records of public spending (contracts, registers) | exactly what was bought and for how much | strong |
| Paid advisory databases, professional helpdesks, "ask an expert" archives | people who paid or made an effort to ask about a case nobody explains; shows the edge cases | medium to strong |
| Trade forums, association newsletters and member pages, comments under trade articles | questions, workarounds, complaints in the people's own words | weak to medium |
| Shared or sold templates, spreadsheets, scripts, home-made libraries | effort spent on a workaround | medium |

Practical points:

- Check early which places you can actually open. Some block automated access, some need a real browser because the content or the comments load by script, some have a site search that only works in a browser. If a headless browser is available, use it before giving up on a source.
- A tool that summarises a page for you may silently drop comment sections and long lists. When the signal is in the comments or the listing, read the raw page.
- Say which sources you could not reach, and what the user could bring from closed places, rather than filling the gap from memory.

## When the area is a change

A new legal duty, a tool that shut down, a price rise or a new platform rule is **a place to look, not a signal**. Searching it has two separate parts, and the first one alone produces nothing:

1. **Find the change**: what exactly becomes required or stops working, for whom, from when, and how certain the date is.
2. **Find the people who are already doing something about it**: asking in their own places, paying an adviser, hiring for it, building workarounds. Only this part gives signals.

What decides whether a change is worth the search:

- **Look ahead, not at next month.** A duty that starts in a few weeks is too late: nothing can be built and verified in time, and every vendor has already reacted. The useful window is roughly 6 to 18 months ahead: rules already passed with a later start date, or far enough in the approval process that the affected people are getting nervous. Find them in the pipeline (collections of laws by start date, parliamentary and government agendas, the regulator's announcements, trade associations warning their members), not in the news about what starts now.
- **The bigger the change, the more crowded it is.** A duty that hits everyone is announced by every vendor months ahead. Value is in small duties for a narrow group, or in **who falls through** a big one: the cases the large vendors do not cover.
- **Check for a free official tool.** When the state or the platform gives the smallest users a free way to comply, the bottom of the market is gone. Find out what the free tool does not do and who cannot use it.
- **An uncertain date is a risk to write on the card.** Duties get postponed, narrowed and cancelled.

## How to search

1. **Collect raw signals** in the agreed area, from the places above. Record each as: who (kind of person), what they did, strength, literal quote, link, date. An article or a vendor page is never a row in this table.
2. **Group signals into problems**, written as "<who>, in <situation>, has to <painful thing>, and today handles it by <current way>". Two signals are the same problem when the same kind of person is in the same situation, even if they describe it differently. Do not name a product yet.
3. **Filter.** A problem goes on only if you can answer yes to all five, each with evidence:
   1. Can we name twenty specific people or companies who have it?
   2. Do they already handle it somehow, paying in money or time?
   3. Does it happen often (weekly, not yearly), or rarely but at a high cost?
   4. Does the person who feels the pain also decide about buying?
   5. Can the user reach these people repeatedly, not only through acquaintances?
4. **Research the survivors**: what the alternatives are and what they cost, what their customers complain about, how the people could be reached, and **how crowded it is**: which established vendors already announced a solution, how many new products for this exact problem appeared in the last year and whether any is clearly winning, and whether a free official tool covers it. Many fresh attempts with no winner is a warning; so is every incumbent having it on their roadmap.
5. **Write the case against.** For each survivor, the strongest reasons it will fail. If subagents are available, give this to a separate one that sees only the card, not your enthusiasm. A card without a serious case against is not finished.
6. **Hand over at most three candidate cards**, using the card format from `opportunity-template.md` in the `business-opportunities` skill's folder, written into the opportunity file. Only now add a one-line idea of a solution, the riskiest assumption and the cheapest test for it.

If the search finds nothing that passes the filter, say so. An empty result is a result; change the area with the user instead of lowering the bar.

## Traps in this step

- **Mistaking context for signals.** Ten articles about a new duty and five vendor pages are zero signals.
- **Starting from the idea** and looking for signals afterwards. You will always find some.
- **Counting weak signals.** A hundred complaints are worth less than five people who pay a freelancer.
- **Signals from different kinds of people** added up as if they were one problem.
- **A market made of prose.** A fluent description of demand with no links and quotes behind it.
- **Filling gaps from memory** when a source could not be opened.
- **Lowering the bar** to have three cards. One strong card, or none, is a valid result.

The next step, verifying the problem with real people, is in `business-opportunities`.
