# The Monday plan

The hard deadline is **Monday 26 October 2026, 23:59**. This replaces the original nine-phase plan, which `docs/AUDIT.md` showed couldn't be finished in time (46 to 62 hours of work, against about 30 productive hours left on Sunday 25 October at 00:30).

The goal is one complete, deployed loop that a judge can walk alone: a business posts a tryout, a young person finds it and applies, the business books them, the day runs from check-in to Received, and a reference lands on the record. Everything not in this plan is explained in the slides, not built.

Work one item at a time, in order. Each item ends with `npm run check` passing, a short summary, and a commit. If an item runs over its budget, stop and re-plan rather than eat the next item's time.

## Plan

| # | Item | What "done" means | Budget | State |
| --- | --- | --- | --- | --- |
| A | Re-plan | The audit committed; this plan | 0.5 h | Done |
| B | Cleanup from the audit | Env docs match how Next.js loads files; pinned `firebase-tools`; rate limits count days in SAST; SECURITY.md honest; shared `PageTitle` and saved-details components; more lint boundaries; stale demo data removed | 2 h | Done |
| C | Real services | `docs/DEPLOY.md` written, then followed in the consoles: GitHub, Firebase (Auth, Firestore, Storage, rules), Netlify, the Anthropic key, `npm run eval:ai` passing | 2 h | Done: live at firstshiftza.netlify.app |
| D | UI foundation v3 | Spacing scale, app shell (header with Sign out, role nav), deliberate desktop layouts, branded 404 and error pages, matching skeletons, home intent, axe and Slow 4G gates in the e2e script | 3 h | Done |
| E | Posting, server | Tryout repository, service, routes (draft, post, withdraw) with rate limits, and tests | 2.5 h | Done |
| F | Posting, screens | Posting screen and business dashboard, from the reference design (`reference/prototype.html`) | 3 h | Done |
| G | Finding | Nearby list by geohash (no push alerts), served by the server; tryout detail with fares and the injury cover line; applying with the daily limit; "N applied" on the dashboard | 4 h | Built |
| H | Booking | Ranked short list, booking, check-in code, WhatsApp chat and trip share as plain `wa.me` links. Booking refuses the 24-hour line (`regularEmployment.ts`, "Offer them a job instead?"). "Report a problem" on every booking | 3 h | Built: offers, accept, booking page, status page, Applications, nav badges |
| I | The day and paying | Door check, check-in, check-out, the pay rules, Paid and Received, with the payment line below wherever payment appears. "Report a problem" stays on the booking through the day | 3 h | Built. Deadlines are checked whenever either party opens a screen (not Netlify Scheduled Functions) |
| J | Records | The owner's three answers, the AI reference, and the young person's review: they see the three answers as the fixed criteria and the wording labelled "Written with AI", then tap "Add to my record" or "Challenge it" (`references.ts`). Only approved references reach the shareable record; a challenge opens a review case | 2.5 h | Built (Phase 6, 26 October 2026): references, `/work/record` and its share link, job offers, `npm run review:case`, `npm run pilot:metrics` |
| K | Demo mode | Seeded demo accounts at every stage, rebuilt against the real data model and labelled demo everywhere; one judge can walk the loop alone | 3 h | Done (26 October 2026): one-tap sign-in as Thabo or Sipho, a "Demo account" bar with Reset the demo, two finished tryouts and an approved reference seeded, Skip to the day on demo bookings, placeholder photos, and the two businesses without accounts shown as examples |
| L | Plain pages | Contact, Privacy, and a public "Safety and fair play" page (below), linked from the home page footer, sign-in and every booking. Privacy must say why an admin keeps full names, phone numbers and the last four ID digits: to find the person behind an account for a safety report, a payment dispute or a strike (`SECURITY.md`, Privacy) | 1 h | Done (26 October 2026): `/safety`, `/privacy`, `/terms`, `/contact`, a footer on every public page, and the agreement at sign-in, recorded per version. Emergency numbers rechecked that day |
| M | Launch | Final deploy, ZAP baseline reviewed, Slow 4G phone test, the pre-submit checklist in `AGENTS.md` | 2 h | |
| | | | **31.5 h** | |

**Cut line.** If at Monday 12:00 items F to K aren't all done, cut in this order and say so in the slides:

1. J's AI reference: show the three answers as the reference instead.
2. H's WhatsApp and trip-share links.
3. I's door check: keep check-in by code only.

Demo mode (K) is never cut: without it, a judge can't see the loop.

**Only if time allows:** "Delete my account" (1.5 h). Until then, SECURITY.md offers deletion on request to the support email, completed within 30 days.

## From the panel's feedback

The Geekulcha panel's points, our answers and where each lives are in `docs/FEEDBACK.md`; the law behind them is in `docs/COMPLIANCE.md`. What they add to the plan above:

- **Report a problem** on every booking (H, I), for either side, with four kinds: harassment, unsafe work, not paid, other (`cases.ts`). Harassment and unsafe work pause the business at once (`pausesBusinessAtOnce`, fed into `accountStatus`); every report opens a review case.
- **The payment line**, word for word, everywhere payment appears (I, and the home page and onboarding already): "You send the payment yourself, from your FNB app, your bank or in cash. First Shift does not move money. It records the payment, and the young person confirms they received it."
- **Safety and fair play**, a public plain-text page (L) covering: identity checks (what we check: the SA ID number's structure, age 18 or older, one ID per account, the face and the ID card at the door; what we don't yet: a licensed identity check, refugee and permit documents, COIDA registration with the Fund); non-payment; cancellations; disputes; harassment; injuries and COIDA; and the 24-hour line. Emergency and GBV numbers only after checking each against an official government source on the day: police 10111, ambulance 10177, 112 from a cellphone ([Western Cape Government](https://www.westerncape.gov.za/know-who-you-can-call-emergency)), and the GBV Command Centre 0800 428 428, run by the Department of Social Development ([SAnews](https://www.sanews.gov.za/node/40913)). The government proposed in November 2024 to make 112 the only emergency number, so check it again before adding them.

## Pilot

Six weeks in Ivory Park, Tembisa and Midrand, after a labour lawyer has reviewed `docs/COMPLIANCE.md`: 10 to 15 businesses and 50 young people, recruited in person with a youth organisation.

`npm run pilot:metrics` (a script over Firestore, real records only, never demo) reports, per week and in total:

| Metric | What it counts | Target by week 6 |
| --- | --- | --- |
| Completed and paid | Tryouts that ended with Received | 60 |
| Repeat businesses | Businesses with 2 or more completed tryouts | Half of the active ones |
| Safety reports | Reports by kind, and how long each took to close | Every one closed within 48 hours |
| References approved | Approved, out of all references written; challenges and how they ended | 9 in 10 approved |
| Job offers made | "Offer {name} a job" recorded by the owner | 5 |
| Tryout to job | Job offers the owner marked "Hired" | Tracked from week 1; no target yet |

A week where a safety report stays open, or a payment isn't confirmed, is reviewed before more tryouts are posted that week.

## Built as rules, not screens

These are already in `src/domain` with unit tests, and the slides show them as working rules. Their screens are roadmap.

- Cancellations and the free-cancel window (`cancellation.ts`)
- Strikes, suspension and the 90-day expiry (`strikes.ts`)
- Pauses for unpaid tryouts (`paymentFlow.ts`)
- Fees due (`fees.ts`), shown on the dashboard only if F has time
- The 24-hour line (`regularEmployment.ts`), wired in with booking (H)
- Reference review: draft, approved, challenged (`references.ts`), screens in J
- Reports and review cases (`cases.ts`), the button in H

## Cut, roadmap only

Explained in the slides as next steps, not built:

- Push alerts for new tryouts
- The fill forecast
- The Android APK
- Blind ratings
- The review list as a screen: for now it's `npm run review:case`, run by an admin
- Checking COIDA registration with the Compensation Fund
- Designed Contact and Privacy pages (L ships plain ones)

## Non-code deadlines

| When | What |
| --- | --- |
| Sunday 12:00 | Lean Business Canvas |
| Monday afternoon | Slides, including the cut list above as the roadmap |
| Monday 23:59 | Final submission |

The SSDLC (Saturday 12:00) and the 20-second video (Saturday 13:30) were due before this plan was written.
