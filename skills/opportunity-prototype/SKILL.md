---
name: opportunity-prototype
description: Step 3 of the `business-opportunities` skill, and the default way to start any new product - build the cheapest first version that can tell whether people want it, instead of the whole working app. Covers three techniques - a fake door (an offer whose button leads to an honest "not ready yet"), a clickable mockup with made-up data, and a Wizard of Oz version (it looks finished, a person does the work behind it) - how to choose between them, what to fake and what never to fake (the value delivered, the payment), keeping the agent from building the full app, honest disclosure, bringing the right visitors, measurement and the success criterion written before launch, and seams that let the real product replace the fake piece by piece once there are paying users. Use when starting a new project, product or feature nobody has paid for yet, when the user asks for an MVP, a prototype, a landing page to test interest, a "fake" or demo version, or wants to check demand before implementing, and when `business-opportunities` reaches step 3.
---

# Opportunity prototype

Building is cheap now, which makes it tempting to build the whole app first. That is the slow way to learn that nobody wants it. This step builds only what is needed to see **whether people act**: click, leave a contact, pay, come back. The real implementation follows the people who showed up, piece by piece.

It is step 3 of `business-opportunities`. If the problem has not been verified yet (steps 1 and 2), say so: a fake version of an unverified idea is just a faster way to build something nobody asked for. For a consumer product, skipping step 2 is acceptable.

## Choose the technique by the question

Every version answers one question. Pick the question first, then the cheapest technique that answers it.

| Technique | What the visitor sees | What is really there | Question it answers | Cost |
|---|---|---|---|---|
| **Fake door** | an offer: page or button, with a price | after the click an honest "not ready yet" and a way to be told when it is | does the promise interest the right people at this price? | hours |
| **Clickable mockup** | the app, with made-up data, clickable | screens and transitions, nothing computes or saves | do they understand what it does and want to use it? | a day or two |
| **Wizard of Oz** | a working product | the result is made by a person by hand (or a script run by hand) | will they pay for the result and come back for more? | days, plus manual work per customer |

- Start with the fake door when the offer itself is uncertain (who it is for, what it promises, what it costs). It is the only one cheap enough to run for several ideas side by side.
- Use the mockup when interest is shown but it is unclear whether people get it. Show it in conversations or send it to people who left a contact; watching someone use it teaches more than counting clicks.
- Use Wizard of Oz when people want it and the question is whether they pay and return. It is the only one of the three that produces real payments, so it is the strongest evidence.

They chain naturally: fake door, then a mockup for those who signed up, then Wizard of Oz for those who still want it.

## Fake the machine, never the value

The rule that keeps this honest and the results meaningful:

- **May be faked:** everything behind the screen. Data written directly in the code, results prepared by hand, orders that arrive as an email or a row in a sheet, a person doing what an algorithm will do later.
- **Never faked:** what the customer gets and what they pay. If someone pays, they receive the result (made by hand if needed) or their money back. Never show a payment form that does not charge, never take payment for something that will not be delivered, never fake a cancellation or a refund.
- **A fake door says it is a fake door** right after the click: plainly that it is not available yet, what happens next, and a way to be notified. Show it only to people the offer is for, and not repeatedly to the same people.

## What to build, and what not

Left alone, an agent builds the full app: accounts, database, admin, settings. Do the opposite. Before writing code, list what the version needs for its one question and cut the rest.

| Usually needed | Usually not |
|---|---|
| one page or a few screens around the core moment | sign-up and login (an email field is enough) |
| the offer in the customer's words, with the price | a database (data in code, a JSON file or a spreadsheet) |
| one clear action: buy, reserve, leave a contact | an admin interface (the inbox or the sheet is the admin) |
| a payment link from a payment provider, if money is involved | a payment integration, webhooks, invoicing logic |
| a notification to the user for every action (email, chat message) | roles, settings, edge cases, scaling |
| event tracking for the action and each step before it | polish beyond "looks trustworthy" |

For Wizard of Oz also write down **who does the manual work, how fast, and up to how many customers**. When manual work becomes the bottleneck, that is the signal to automate that part, not before.

If personal data passes through the manual part, say in the privacy terms that a person may process it. Do not imply automation where a person reads private data.

## Before launch

Write these into the opportunity file (see `business-opportunities`), or into the project's notes when the work did not start there:

1. **The question** this version answers, in one sentence.
2. **The success criterion**: how many of which action, from how many relevant visitors, by which date. Written now, not after.
3. **Where the visitors come from**: direct outreach, communities the user really belongs to, the user's own audience, or paid ads. Only people from the segment count; friends and broad traffic measure the traffic, not the idea. Spending money and posting under the user's name need the user's approval.
4. **How many are needed.** Only a few percent of strangers act. With 200 visits the difference between zero and three is chance; plan for high hundreds to thousands of relevant visits for consumer products, or a few dozen direct offers for business customers.
5. **Measurement in place**: the events, tagged links per source, and where the numbers will be read. A test whose result nobody can look up is not a test.

What each action proves:

| What the visitor did | What it proves |
|---|---|
| came to the page | nothing, only that the headline or the ad works |
| clicked "buy" or left an email | interest, weak (costs a second, commits to nothing) |
| entered a card and paid | willingness to pay |
| paid and came back | that the solution works |

Most people who click "buy" never finish paying, so a fake door overstates demand several times. Treat its result as a sieve, not as proof.

## After the test

Compare the result with the criterion written before launch and decide: build, change the offer or the segment, or kill. Write the decision and the reason into the opportunity file.

When it passes, do not rewrite everything at once. Build the fake so it can be replaced in parts:

- **Keep** what the visitor sees and the words of the offer: they were tested.
- **Replace first** the manual step that hurts most, which is usually the one repeated for every customer.
- **Throw away** made-up data and shortcuts that exist only to look real.
- Keep each fake behind one clear place in the code (one function, one module, one file of data), so that swapping it for the real thing does not touch the rest.

The real product is built for the people who paid, in the order their use shows, not from the original feature list.

## Traps

- **Speed taken as proof.** It was built in an afternoon and looks great, so it feels validated. A polished fake proves you can build, not that anyone wants it.
- **No visitors.** A version nobody from the segment saw has answered nothing.
- **Counting clicks as demand.**
- **The full app sneaking in**: login, roles and an admin panel before the first paying customer.
- **Faking the value or the payment.** It damages trust exactly with the people you need, and in many places it is illegal.
- **Endless Wizard of Oz.** Manual work that never gets automated because there was never a decision point. Set a limit (customers, hours a week) at which a part gets built.
- **Changing the criterion after the result.**

## How solid this is

The techniques come from Alberto Savoia's pretotyping (*Pretotype It*, *The Right It*): fake door, "Pinocchio" for the mockup and "Mechanical Turk" for Wizard of Oz. The disclosure and "never fake payment" rules are consistent product-practice advice. The numbers are rules of thumb; say so when a result is too small to judge.
