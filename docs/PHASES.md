# The Monday plan

The hard deadline is **Monday 26 October 2026, 23:59**. This replaces the original nine-phase plan, which `docs/AUDIT.md` showed couldn't be finished in time (46 to 62 hours of work, against about 30 productive hours left on Sunday 25 October at 00:30).

The goal is one complete, deployed loop that a judge can walk alone: a business posts a tryout, a young person finds it and applies, the business books them, the day runs from check-in to Received, and a reference lands on the record. Everything not in this plan is explained in the slides, not built.

Work one item at a time, in order. Each item ends with `npm run check` passing, a short summary, and a commit. If an item runs over its budget, stop and re-plan rather than eat the next item's time.

## Plan

| # | Item | What "done" means | Budget | State |
| --- | --- | --- | --- | --- |
| A | Re-plan | The audit committed; this plan | 0.5 h | Done |
| B | Cleanup from the audit | Env docs match how Next.js loads files; pinned `firebase-tools`; rate limits count days in SAST; SECURITY.md honest; shared `PageTitle` and saved-details components; more lint boundaries; stale demo data removed | 2 h | Done |
| C | Real services | `docs/DEPLOY.md` written, then followed in the consoles: GitHub, Firebase (Auth, Firestore, Storage, rules), Netlify, the Anthropic key, `npm run eval:ai` passing | 2 h | Guide written; console steps with the owner |
| D | UI foundation v3 | Spacing scale, app shell (header with Sign out, role nav), deliberate desktop layouts, branded 404 and error pages, matching skeletons, home intent, axe and Slow 4G gates in the e2e script | 3 h | Done |
| E | Posting, server | Tryout repository, service, routes (draft, post, withdraw) with rate limits, and tests | 2.5 h | Built, waiting for review |
| F | Posting, screens | Posting screen and business dashboard, from the reference design (`reference/prototype.html`) | 3 h | |
| G | Finding | Nearby list by geohash cell (no push alerts), tryout detail with fares, applying with the daily limit | 4 h | |
| H | Booking | Ranked short list, booking, check-in code, WhatsApp chat and trip share as plain `wa.me` links | 3 h | |
| I | The day and paying | Door check, check-in, check-out, the pay rules, Paid and Received | 3 h | |
| J | Records | The owner's three answers, the AI reference, the reference on the record | 2.5 h | |
| K | Demo mode | Seeded demo accounts at every stage, rebuilt against the real data model and labelled demo everywhere; one judge can walk the loop alone | 3 h | |
| L | Contact and Privacy | Two plain text pages: what we collect, why, deletion on request, the support email | 0.5 h | |
| M | Launch | Final deploy, ZAP baseline reviewed, Slow 4G phone test, the pre-submit checklist in `AGENTS.md` | 2 h | |
| | | | **31 h** | |

**Cut line.** If at Monday 12:00 items F to K aren't all done, cut in this order and say so in the slides:

1. J's AI reference: show the three answers as the reference instead.
2. H's WhatsApp and trip-share links.
3. I's door check: keep check-in by code only.

Demo mode (K) is never cut: without it, a judge can't see the loop.

**Only if time allows:** "Delete my account" (1.5 h). Until then, SECURITY.md offers deletion on request to the support email, completed within 30 days.

## Built as rules, not screens

These are already in `src/domain` with unit tests, and the slides show them as working rules. Their screens are roadmap.

- Cancellations and the free-cancel window (`cancellation.ts`)
- Strikes, suspension and the 90-day expiry (`strikes.ts`)
- Pauses for unpaid tryouts (`paymentFlow.ts`)
- Fees due (`fees.ts`), shown on the dashboard only if F has time

## Cut, roadmap only

Explained in the slides as next steps, not built:

- Push alerts for new tryouts
- The fill forecast
- The Android APK
- Blind ratings
- The "Offer a job?" hire prompt screen
- The review list screen for disputes, reports and appeals
- Designed Contact and Privacy pages (L ships plain ones)

## Non-code deadlines

| When | What |
| --- | --- |
| Sunday 12:00 | Lean Business Canvas |
| Monday afternoon | Slides, including the cut list above as the roadmap |
| Monday 23:59 | Final submission |

The SSDLC (Saturday 12:00) and the 20-second video (Saturday 13:30) were due before this plan was written.
