# Audit 2: the judge's view, submission day

> A dated snapshot: what was true at the commit named below. It is kept as a record and is not updated; the code and the other documents have moved on since.

Read-only audit, Monday 26 October 2026, 08:40 to 09:30 SAST, at commit `577db6f` ("Phase 6: records and hiring"), deployed to https://firstshiftza.netlify.app at 08:43. Nothing in the code was changed. This replaces nothing: `docs/audits/AUDIT.md` is the Sunday 00:10 snapshot.

**How it was checked.** `npm run verify` (654 unit tests, every budget, 0 vulnerabilities) and the rules tests (26 of 26) passed before the deploy. `/api/health` on the live site reports every integration configured and live, and `"emulators": false`. Both demo accounts were signed in through the real sign-in page in Microsoft Edge at 390 px, and every screen they can reach was captured (text, links, tap targets, screenshot). Sipho offered his first tryout to Thabo, Thabo accepted, and both booking pages were captured; three posting requests went through the live model (allowed, blocked, asks for money); nothing was posted. `npm run demo:reset` ran before and after. Public pages were checked at 320, 390, 768 and 1280 px with axe-core. knip 5.88.0 was run through npx, outside the project.

**Not checked:** signed-in screens at 320, 768 and 1280 px (390 only, plus sign-in at 1280); a Slow 4G run; anything from check-in onwards on the live site, because it can't be reached (finding A1).

Priorities: **P1** breaks a judge's journey, **P2** hurts a score, **P3** is polish. Tags: **FUNCTIONAL**, **LANGUAGE**, **UI**.

## The short version

The engineering is strong and the screens that exist are good: posting with the AI and its refusals, the ranked shortlist, the booking page, Share my trip and the credits screen all work on the live site, look deliberate, and pass axe. But **a judge can walk only half the loop**. The earliest demo tryout starts tomorrow, check-in opens an hour before the start, and nothing in the product moves time on. So check-in, check-out, Paid, Received, the AI reference, the work record, its share link and the job offer, which is everything that makes First Shift different, are unreachable today on the live site. The e2e test reaches them only through `startNow()`, which works on the emulators alone. Second, a judge who arrives at the home page can't find a way in: no sign-in link, no demo link, no credentials on the site, and nothing says what First Shift charges.

## A. Role journeys

### A1. Young person (Thabo, demo), live at 390 px

| Step | What happens | Verdict |
| --- | --- | --- |
| Discover | Home page: the promise, an example slip, three steps, three pitches | Good |
| Sign in | Demo form, lands on `/work` | Works |
| Profile | `/work/profile`: saved details, then the editable ways to be paid, skills, languages and introduction | Works; demo saves are refused by design |
| Find | Four tryouts, soonest first, with fare, injury cover and "Paid on time" | Good |
| Apply | Note, Apply, "You've applied" | Works |
| Offer | Badge "Applications (1 new)", "Offered to you", Accept or Decline, "The offer ends at 8:00" | Works |
| Booked | Owner's first name, the pin, Open in maps, the 6-digit code, WhatsApp, Share my trip, Report a problem, Cancel ("Cancelling now is free") | Good |
| Share trip | `/status/{token}` signed out: name, business, time, status | Works |
| Check in, paid, Received, reference, record, share, job offer | **Not reachable today** | **P1** (A1-1) |

| # | Finding | Where | Pri | Tag |
| --- | --- | --- | --- | --- |
| A1-1 | The day can't be reached on the live site. The demo tryouts start tomorrow at the earliest (`src/data/demo.ts`, `daysAhead: 1`), check-in opens an hour before the start (`decideCheckIn`, `too_early`), and the only way past that is `startNow()` in `scripts/e2e/session.ts`, which writes to the emulators. A judge sees no check-in, no pay, no Received, no reference, no record entry and no job offer. | `src/data/demo.ts`, `src/domain/day.ts`, `scripts/resetDemo.ts` | P1 | FUNCTIONAL |
| A1-2 | The work record is empty for the demo account ("Your first paid tryout will show here once you tap Received"), so the record and its share link, the product's payoff, are never seen | `/work/record`, `src/data/demo.ts` | P1 | FUNCTIONAL |
| A1-3 | Every photo shows "No photo": the demo profiles point at `photos/{uid}/profile.jpg` with `version: "demo"`, but no file is there. The door check asks the owner to match a face to this photo | `src/data/demo.ts` `photo()`, `/bookings/[id]`, shortlist | P2 | FUNCTIONAL |
| A1-4 | Applying to Lerato's Spaza or Ayanda's Car Wash leaves the application hanging for good: those businesses have no account behind them, so nobody can ever offer, decline or answer | `DEMO_EXTRA_OWNERS`, `/work/applications` | P2 | FUNCTIONAL |
| A1-5 | The feed says "Within 10 km of Ivory Park." above a Randburg tryout "about 21 km" away. The taxi-route rule allows it, but the heading says otherwise | `/work`, `findingMessages.ts` | P3 | LANGUAGE |
| A1-6 | "The offer ends at 8:00" gives no day; the offer actually ends tomorrow at 8:00 | Offer panel on `/work/tryouts/[id]` | P3 | LANGUAGE |
| A1-7 | Once booked, the overlapping Spaza tryout still sits in the feed; only opening it says "You're booked on another tryout at this time" | `/work` | P3 | UI |
| A1-8 | "Booked" shows twice at the top of the booking page: as the subtitle and as the Stamp | `BookingDetail.tsx:64-65` | P3 | UI |

**Bad paths** (read in code; walked only where the live site allows):

| Path | What exists | Gap | Pri | Tag |
| --- | --- | --- | --- | --- |
| Declined, not selected | Statuses in Applications; "Not selected" on booking | Thabo is the only demo young person, so "Not selected" can't be shown | P3 | FUNCTIONAL |
| Cancelled late | The cancel panel says it's a strike and what's owed | **Strikes never suspend anyone.** They're written (`firestoreBookingRepository.ts:20`), but `accountStatus()` in `strikes.ts` is never called, so "3 active strikes: suspended" in `docs/RULES.md` isn't true. Nobody can see their own strikes | P2 | FUNCTIONAL |
| Business not open | Button after the start; opens a review | Then silence: the case is decided with `npm run review:case` and nothing in the app tells either side what was decided | P2 | FUNCTIONAL |
| Not received | Proof form, business paused at once, e2e-tested on the emulators | Same silence after review | P2 | FUNCTIONAL |
| Challenge a reference | Opens a case; the reference waits | Same; the young person isn't told when or how it ends | P2 | FUNCTIONAL |

**Fairness check.** The young person is protected well on paper (minimum wage in code, paid for the trip if the business fails, never asked for money, proof only in a dispute). What's left hanging: every review case ends in silence in the app, and applications to two of the three demo businesses can never be answered.

### A2. Business (Sipho, demo), live at 390 px

| Step | What happens | Verdict |
| --- | --- | --- |
| Sign in | Lands on `/business` | Works |
| Dashboard | Credits summary ("Free tryouts left: 3", R25 explained), Post a tryout, own tryouts with "Live, 1 applied" and Withdraw | Good |
| Post, allowed | The model drafts a title, five tasks, date, time, 5 hours at R30.23 | Works, but see A2-3 |
| Post, blocked | "This work can't be a tryout. Electrical work must be done by a registered electrician. You could post help tidying the stockroom while they work." | Excellent |
| Post, asks for money | Refused before the model: "A tryout never costs the young person anything..." | Excellent |
| Shortlist | Ranked, with "Likely to show up: 60 out of 100" and its reasons, skills, languages, the note | Strong |
| Offer, booking | Offer, then Thabo accepts; credits show Available 2, Held 1 | Works |
| Door check, no-show, check-out, pay, job offer | **Not reachable today** (A1-1) | P1 |

| # | Finding | Where | Pri | Tag |
| --- | --- | --- | --- | --- |
| A2-1 | After booking, the owner's tryout page says "Who applied: Nobody has applied yet. Young people nearby can see this tryout now." Both halves are false: Thabo applied and is booked, and the tryout is closed | `/business/tryouts/[id]`, `OwnerTryout.tsx` | P2 | FUNCTIONAL |
| A2-2 | The owner's booking page doesn't say what happens next. Thabo's page explains the code and the door check; Sipho's says nothing about when check-in opens (8:00) or that he checks the face, the ID card and types Thabo's code | `/bookings/[id]` (business side), `bookingMessages.ts` | P2 | LANGUAGE |
| A2-3 | Asked for "Saturday morning", the model titled it "Saturday Phone Shop Helper" and set the date to Tuesday 27 October. An owner can post that mismatch without noticing | `/business/post`, `src/server/prompts.ts`, draft schema | P2 | FUNCTIONAL |
| A2-4 | No business profile screen. The tab bar is Tryouts, Post, Credits; a business can't see or change its name, area, pin, hours, shopfront photo or COIDA answer after onboarding. `/business/owner` is reachable only by URL and shows an empty form even when the details are saved | `src/config/nav.ts`, `/business/owner` | P2 | FUNCTIONAL |
| A2-5 | A booked tryout on the dashboard links to the tryout page, not the booking; the booking is one more tap behind "See the booking" | `/business` `TryoutList.tsx` | P3 | UI |
| A2-6 | "Held for booked tryouts" and "A credit is held" are jargon | `creditsCopy.ts:19,21,39` | P3 | LANGUAGE |

**Bad paths:**

| Path | What exists | Gap | Pri | Tag |
| --- | --- | --- | --- | --- |
| No credits | Drafting refused before the model; Credits has "Request more credits" | The posting screen says "You've used your free tryouts. Top-ups open soon. Contact us", which contradicts Credits and is wrong for paid credits | P2 | LANGUAGE |
| Paused | Posting refused: "Your account is paused, so you can't post tryouts right now. Contact us to sort it out." | No banner on the dashboard, no reason (unpaid tryout or a report) and no way to resolve it, against "A paused or suspended user sees why and what resolves it" (`docs/RULES.md`) | P2 | FUNCTIONAL |
| Late cancellation | Warning with the strike and the 4 hours owed | Strikes don't suspend (see A1) | P2 | FUNCTIONAL |
| A report against them | Paused at once for harassment, unsafe work or asking for money | The business is never told it was reported or why it's paused | P2 | FUNCTIONAL |

**Fairness check.** The business pays only when the young person is owed (`settle()`), and gets its credit back otherwise. It's treated less fairly on information: a pause arrives without a reason, and the review outcome never reaches it in the app.

### A3. A judge who knows nothing

| Question | Answer from the home page alone |
| --- | --- |
| What is it? | Yes: "Paid one-day tryouts at businesses near you, with a reference from the business that paid." |
| How does it work? | Yes, three steps |
| Who pays the young person? | Yes: the business, by eWallet, PayShap, cash-send or cash |
| What does First Shift cost, and who pays it? | **No.** R25 a credit, first 3 free, appears only inside the business account |
| How do I try it? | **Not obvious.** No header sign-in link, no "Try the demo", no footer. The way in is "Find a paid tryout", which redirects to sign-in, where "Judges and testers: use a demo account" asks for an email and password that are nowhere on the site |

| # | Finding | Where | Pri | Tag |
| --- | --- | --- | --- | --- |
| A3-1 | A judge without the slides open can't get in: the demo emails and passwords exist only in the submission | `/sign-in`, `DemoSignIn.tsx` | P1 | FUNCTIONAL |
| A3-2 | Nothing in the app says "demo". Sipho's business, the two businesses without accounts and their "Paid on time: 6 of 6" look real. The pre-submit checklist requires demo data labelled everywhere it appears | every account screen | P2 | UI |
| A3-3 | All judges share two accounts and one world: after one judge books Thabo, the next sees no Offer button and no Accept | demo design | P2 | FUNCTIONAL |
| A3-4 | The home page never says what First Shift charges or how it earns (R25 a credit, first 3 free) | `(marketing)/page.tsx` | P2 | LANGUAGE |
| A3-5 | "The business writes your reference" (home, step 3) while the app labels it "Written with AI from the business's answers" | `HowItWorksBand.tsx` | P3 | LANGUAGE |
| A3-6 | The home example slip puts Sipho's Phone Repairs in Ivory Park; the demo puts it in Randburg | `ExampleTryout.tsx` | P3 | LANGUAGE |

## B. Navigation

| # | Finding | Where | Pri | Tag |
| --- | --- | --- | --- | --- |
| B-1 | Marketing header is the wordmark only: no Sign in, no demo link | `PageShell.tsx` | P1 (with A3-1) | UI |
| B-2 | No footer anywhere, and no Privacy, Contact or Safety and fair play page (plan item L, still blank). The support email appears only inside error messages | `(marketing)`, `src/config/contact.ts` | P2 | FUNCTIONAL |
| B-3 | Business has no profile destination (A2-4); `/business/owner` is orphaned | `src/config/nav.ts` | P2 | FUNCTIONAL |
| B-4 | `/bookings/[id]` has no back link (every other detail screen has one) | `BookingDetail.tsx` | P3 | UI |
| B-5 | `/status/{token}` and `/record/{token}` error states are dead ends: no action under the message | `(marketing)/status`, `record` | P3 | UI |
| B-6 | Booked tryout on the dashboard goes to the tryout, not the booking (A2-5) | `TryoutList.tsx` | P3 | UI |
| B-7 | **The demo form twice on `/sign-in`:** not reproduced on the live site at 390 or 1280 px; the form appears once. Under `next dev` with the emulators, the test-only sign-in form (`TestSignIn.tsx`) renders under the demo form, which is the likely source. Production excludes it, and `npm run budget` fails the build if its marker appears. What does need fixing: once opened, the demo form has no heading and doesn't say which account is the business and which the young person | `SignInPanel.tsx`, `DemoSignIn.tsx` | P3 | UI |

Working: the role tab bars (young person: Tryouts, Applications, Record, Profile; business: Tryouts, Post, Credits) with "1 new" badges; back links on tryout pages; the wrong role's routes redirect (Thabo on `/business` lands on `/work`); the 404 links home; the wordmark links home everywhere.

## C. The job offer flow

**What exists.** `hireOfferDue()` (`src/domain/hire.ts`): after a tryout ends, if the pair has 3 completed tryouts together, or a 4-hour tryout more this month would reach the 24-hour line, the owner's booking page shows "Offer {name} a job" (`HirePanel.tsx`). Tapping it records one offer per pair (`hireOffers`, counted by `npm run pilot:metrics`) and gives a prefilled WhatsApp message. The young person sees "Job offer from {business}" and "The business will contact you on WhatsApp about it." under Applications.

**What each side can do.** The business: record the offer once, then open WhatsApp. The young person: read one line. Nothing else.

**What's missing:**

| # | Gap | Pri | Tag |
| --- | --- | --- | --- |
| C-1 | Unreachable for a judge: it needs 3 completed tryouts together or about 20 hours this month, and the demo has none (A1-1) | P1 | FUNCTIONAL |
| C-2 | The young person sees "Another tryout would make this regular employment... Offer them a job instead?", a line written for the owner, when an accept is refused at the 24-hour line (`bookingMessages.ts:26` reuses `tryoutMessages.ts:50`). There's no button to offer a job at the point the line is hit | P2 | LANGUAGE |
| C-3 | No detail and no answer: no role, pay or hours; the young person can't accept, decline or reply in the app, and the owner never sees an answer | P2 | FUNCTIONAL |
| C-4 | The offer never reaches the work record or the shared record, where "Offered a job by Sipho's Phone Repairs" would be the strongest line an employer could read | P2 | FUNCTIONAL |
| C-5 | The Employment Tax Incentive (`docs/COMPLIANCE.md`) isn't mentioned to the owner at the moment of hiring, where it would matter | P3 | LANGUAGE |

## D. Language

The new rule (GOV.UK): positive contractions are fine (you'll, it's); negative contractions are not (cannot, do not, have not).

**Count, user-facing strings only** (comments, logs, prompts and tests excluded): **106 negative contractions and 1 conditional** ("We'd like to offer you a job", `recordCopy.ts:68`).

| Word | Count |
| --- | --- |
| can't | 43 |
| didn't | 16 |
| isn't | 14 |
| couldn't | 13 |
| don't | 9 |
| aren't | 4 |
| wasn't | 3 |
| doesn't | 2 |
| haven't | 1 |
| won't | 1 |

| File | Count |
| --- | --- |
| `src/domain/messages.ts` | 24 |
| `src/domain/dayMessages.ts` | 15 |
| `src/domain/bookingMessages.ts` | 11 |
| `src/domain/findingMessages.ts` | 10 |
| `src/domain/tryoutMessages.ts`, `src/domain/allowedWork.ts` | 6 each |
| `src/domain/recordCopy.ts` | 5 |
| `src/domain/profileCopy.ts`, `bookingStatus.ts` | 2 each |
| `src/domain/paymentMethodCopy.ts`, `creditsCopy.ts` | 1 each |
| `src/server/*` (claude 2, dayService 2, auth, firebaseAdmin, hireService, referenceService) | 8 |
| `src/lib/*` (api 2, AuthProvider) | 3 |
| `.tsx` files (not-found, ProfileErrorState, ApplicationsList, TryoutList, WithdrawSheet, PostOutcome 2, OwnerTryout, BookingDetail, HirePanel, ConfirmPayment, DayPanel) | 12 |

"We can't find that booking. Go back and check your tryouts." is written out 8 times (`dayService.ts:24`, `hireService.ts:17`, `bookingMessages.ts:102`, `dayMessages.ts:15,25,117`, `ConfirmPayment.tsx:8`, `DayPanel.tsx:21`): one constant, fixed once.

**Note before rewriting:** the payment line, "First Shift doesn't move money", is mandated word for word in `docs/PHASES.md`, `docs/COMPLIANCE.md` and `docs/FEEDBACK.md`. Change it in all three with the code ("First Shift does not move money").

**Other language findings:**

| # | Finding | Where | Pri |
| --- | --- | --- | --- |
| D-1 | Owner's line shown to the young person (C-2) | `bookingMessages.ts:26` | P2 |
| D-2 | "Top-ups open soon" contradicts Credits (A2, no credits) | `PostOutcome.tsx:61` | P2 |
| D-3 | The owner's pay button says only "Paid"; it should say what happens ("Mark as paid") | `dayMessages.ts:66` | P2 |
| D-4 | A failed reference shows "We couldn't draft that right now", or "Tap Write my reference" when that button isn't on screen | `claude.ts:49`, `ReferencePanel.tsx:21,34`, `ReferenceReview.tsx:34` | P2 |
| D-5 | Fallbacks blame the wrong thing: every malformed request says "Some of your details couldn't be saved" (check-out, report, posting); non-API errors say "We can't find that booking" | `validate.ts:15,23`, `CancelPanel.tsx:29`, `ReportForm.tsx:40` | P3 |
| D-6 | Rate-limit messages don't name the limit ("today's limit for this") | `rateLimit.ts:6`, `api.ts:26` | P3 |
| D-7 | Jargon: "review" ("sends it to review", "We've opened a review"), "held", "premises pin", "dashboard" (no screen has that name), "Challenge it", "strike" unexplained | `dayMessages.ts:42,53,77`, `creditsCopy.ts`, `PinStep.tsx:71`, `PostOutcome.tsx:40`, `recordCopy.ts:29`, `bookingMessages.ts:99` | P3 |
| D-8 | Developer text can reach users when something isn't configured ("see README", `ANTHROPIC_API_KEY`) | `claude.ts:14`, `firebaseAdmin.ts:24`, `AuthProvider.tsx:20` | P3 |
| D-9 | Names drift: "Tryout credits", "Credits", "Free tryouts left", "Free credits left"; "Finished" and "Done"; "any more" and "anymore"; three names for the payout number; "One or two sentences" against "in one sentence"; the status link "stops working the next day" against "at midnight" | `CreditsPanel.tsx`, `creditsCopy.ts`, `bookingStatus.ts`, `ownTryouts.ts`, `WithdrawSheet.tsx:64` and others | P3 |
| D-10 | "Didn't go ahead" on the public status page is vague, and it's what a parent sees | `bookingStatus.ts:10` | P3 |
| D-11 | "Safe by design" is a slogan, not a heading ("Your safety") | `findingMessages.ts:37` | P3 |
| D-12 | A broken sentence for old bookings with no method: "...paid you R240 by ." | `dayMessages.ts:70`, `DayPanel.tsx:47` | P3 |

Clean: no em dashes, emoji, middle dots, arrows, all-caps labels, banned words, `rounded-*` classes or "founder" anywhere in `src/` or `public/`.

## E. Devices and installability

| # | Finding | Where | Pri | Tag |
| --- | --- | --- | --- | --- |
| E-1 | The browser tab shows **Netlify's logo**: there's no icon link, and the `/favicon.ico` being served isn't ours | root layout | P2 | UI |
| E-2 | No Open Graph or Twitter tags and no share image on the home page: pasted into WhatsApp, the link shows no picture | `src/app/layout.tsx` | P2 | UI |
| E-3 | iOS: no `apple-touch-icon` (404), no `appleWebApp` settings (`apple-mobile-web-app-capable`, title, status bar) | `src/app/layout.tsx` | P2 | FUNCTIONAL |
| E-4 | No service worker and no offline page; the installed app shows Chrome's own offline screen on no signal | none | P3 | FUNCTIONAL |
| E-5 | The manifest is served as `application/octet-stream`; it has no `id` or `screenshots`, so Android shows the basic install sheet | `public/manifest.webmanifest`, `netlify.toml` | P3 | FUNCTIONAL |

Fine: the manifest has name, short name, `start_url`, standalone display, theme colour, and real 192 and 512 icons plus a maskable one; it's linked from the root layout; the viewport allows zoom. By Chrome's current criteria (HTTPS, a manifest with 192 and 512 icons, `start_url`, standalone; a service worker hasn't been required since about Chrome 108 on Android) the site should be installable on Android today; not confirmed on a device.

**Layouts.** Public pages at 320, 390, 768 and 1280 px: no sideways scroll, nothing clipped, every tap target 44 px or more, axe-core clean. 768 px is the phone column centred, which reads as deliberate. At 1280: the 404, status and record pages put the wordmark at x=64 and the content at x=416 (P3 UI); the home page's closing buttons sit under the first column with two-thirds of the band empty (P3 UI). At 320 the headline leaves "it." alone on its last line (P3 UI, `text-wrap: balance`). Signed-in screens at 390: no sideways scroll; the only items under 44 px are field labels and visually hidden inputs, which is fine. A full-page capture shows the fixed tab bar over the middle of long pages; that's the capture, not the phone.

## F. The repository

**Unused code: none.** knip 5.88.0 found no unused files and no unused dependencies once checked by hand (its three dependency hits are false: `axe-core` is resolved in `scripts/e2e/kit.ts`, `tailwindcss` is imported by `globals.css`, `postcss` comes with `@tailwindcss/postcss`). 17 values are exported but used only in their own file (P3; for example `isPayable` and `dueFrom` in `day.ts`, `rankScore` in `ranking.ts`, `PRIORITIES` in `review.ts`).

| # | Finding | Where | Pri |
| --- | --- | --- | --- |
| F-1 | **README doesn't help a judge:** no live link, no demo sign-in steps, no product summary or screenshots, still "What's in this skeleton" and "Unzip `first-shift.zip`" | `README.md` | P1 |
| F-2 | `docs/AUDIT.md` says "Not one tryout can be posted, found, booked or paid yet": true on Sunday, wrong now, and public | `docs/AUDIT.md` | P2 |
| F-3 | A red X on every commit: the GitHub workflows run and the account is locked. Disable them in the Actions settings (the files stay) | `.github/workflows` | P2 |
| F-4 | `docs/PHASES.md` row K says demo mode is "Started, stages to come"; row L (plain pages) is blank | `docs/PHASES.md` | P2 |
| F-5 | Stale push setup: the VAPID key step in README and `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.example`, read by no code | `README.md`, `.env.example` | P3 |
| F-6 | `public/.well-known/assetlinks.json` is `[]`, a placeholder for an Android app that isn't planned; `reference/prototype.html` is cited in PHASES but not in the repo; no LICENSE | various | P3 |
| F-7 | `scripts/backfillCredits.ts` is a one-off; delete it after it has run once on the live project | `scripts/` | P3 |
| F-8 | Small duplication in `scripts/e2e`: `BASE` twice, `switchTo()` twice, `Timing` three times, `ID_NUMBER` twice | `scripts/e2e` | P3 |

The test-only sign-in is gated safely: dropped from production builds, emulators and localhost only, and `npm run budget` fails the build if its marker appears.

**Proposed `scripts/` structure** (nothing moved):

| Now | Proposed |
| --- | --- |
| `budget.ts`, `evalAi.ts` | `scripts/tooling/` |
| `adminTarget.ts`, `grantCredits.ts`, `reviewCase.ts`, `reviewTryout.ts`, `pilotMetrics.ts`, `backfillCredits.ts` | `scripts/admin/` (backfill deleted once run) |
| `createDemoAccounts.ts`, `resetDemo.ts` | `scripts/demo/` |
| `scripts/e2e/*` | unchanged |

A move changes 10 `package.json` scripts, the relative imports inside the moved files (`../src` to `../../src`; `./adminTarget` to `../admin/adminTarget` in the demo scripts), `SECURITY.md:36-37`, and five code comments (`performance.ts:3`, `tryoutDecisions.ts:134`, `auth.ts:21`, `demoPassword.ts:6`, `demoSignInService.ts:9`). `eslint.config.mjs` and `tsconfig.json` use `scripts/**` and need nothing. About 30 minutes; not worth doing before the deadline.

## G. Judging scorecard

| Criterion | What a judge sees today | Score | What would raise it most |
| --- | --- | --- | --- |
| Product | A real, deployed product: posting with AI, a ranked shortlist, offers, bookings, credits. But the loop stops at Booked for anyone on the live site | 6 | Make the day reachable in demo (H, F1), and seed a record with an approved reference |
| Creativity | The shift slip and Stamp, fares turned into "You keep about R154", "Likely to show up" with reasons, a reference from fixed questions, the 24-hour line turned into a job offer | 7 | Let the judge see the reference and the job offer happen |
| Usability | Clean, fast, accessible (axe clean, 44 px targets, budgets met). Weak where it matters for a first visit: no way in from the home page, no demo labels, the owner isn't told what happens next, a pause comes with no reason | 6 | One-tap demo sign-in, "Try the demo" on the home page, next-step lines on both booking pages, demo labels |
| Sustainability | R25 credits, first 3 free, unit economics in `docs/MONEY.md`, no float. None of it on the home page; top-ups not open | 5 | One honest "What it costs" block on the home page; a business-facing pricing line; the pilot plan in the README |
| Impact | Minimum wage enforced in code, COIDA line, scam rules, fares, a verified work record, the 24-hour line, pilot metrics. The record and the job offer, the impact story, are invisible today | 6 | Show the record and its share link working; record job offers on it |
| Presentation | Netlify's favicon, no share image, a README that reads as a skeleton, a stale audit, a red X on every commit, no Privacy or Safety page | 4 | README top section with the link and demo steps; icon and Open Graph image; delete or mark `docs/AUDIT.md`; plain Privacy and Safety pages; disable the workflows |
| Intelligence | Drafting from one sentence, classification with safer alternatives, a scam pre-filter, AI references from fixed answers, a 20-case eval. The date can contradict the request; the reference can't be seen | 6 | Fix the date handling in the draft; make the reference reachable; say on the posting screen what the AI does and what code decides |

## H. Prioritised fix list

Times are for one developer with the code already open, including the targeted e2e for each change.

### FUNCTIONAL (next prompt)

| # | Fix | Findings | Pri | Time |
| --- | --- | --- | --- | --- |
| F1 | **Demo clock:** a "Skip to the day" button shown only on demo bookings, through a route that refuses anything not `demo: true`, which moves the booking's start to now (what `startNow()` does in e2e). Check-in, check-out, pay, Received and the reference become walkable at any hour | A1-1, A2 | P1 | 1.5 h |
| F2 | **Seed a history:** `demo:reset` adds two completed, paid, Received tryouts between Sipho and Thabo this month, one with an approved reference, so the record and share link have content and the third tryout makes "Offer Thabo a job" appear | A1-2, C-1 | P1 | 1.5 h |
| F3 | **One-tap demo sign-in:** "Try as Thabo, looking for work" and "Try as Sipho, a business" on `/sign-in`, signing in through the server with the passwords from server environment variables (never in the repo); keep the email form for testers | A3-1 | P1 | 45 min |
| F4 | Demo photos: upload a neutral placeholder face and shopfront to each demo photo path in `demo:reset` | A1-3 | P2 | 30 min |
| F5 | Owner's tryout page after booking: show the booked person and "Booked", not "Nobody has applied yet" | A2-1 | P2 | 30 min |
| F6 | Paused banner on the business dashboard, with the reason (unpaid tryout, a report) and what resolves it | A2 paused, report | P2 | 45 min |
| F7 | Wire `accountStatus()` in, or take the suspension claim out of `docs/RULES.md` and say it's roadmap | A1 cancelled late | P2 | 1 h wire / 10 min doc |
| F8 | Case outcomes in the app: when an admin resolves a case, a line on the booking for both sides ("Reviewed on {date}: {outcome}") | A1 bad paths | P2 | 1 h |
| F9 | Business profile screen: a "Business" tab with the saved details and owner details (read-only is enough today) | A2-4, B-3 | P2 | 1 h |
| F10 | Draft date: pass today's date and weekday to the prompt and check that a named day in the request matches the drafted date; otherwise leave the date empty | A2-3 | P2 | 45 min |
| F11 | Job offer on the record: "Offered a job by {business}" on `/work/record` and the shared record | C-4 | P2 | 45 min |
| F12 | The two extra demo businesses: mark their tryouts "Example, for viewing", or have `demo:reset` give them no Apply | A1-4 | P2 | 30 min |
| F13 | iOS and icons: `src/app/icon.png`, `apple-icon.png`, `appleWebApp` metadata | E-1, E-3 | P2 | 25 min |
| F14 | Privacy, Contact, Safety and fair play as plain pages, with a footer linking them | B-2 | P2 | 1 h |
| F15 | README top section: what it is, the live link, how to sign in to the demo, the loop; mark or delete `docs/AUDIT.md`; disable the workflows in GitHub | F-1 to F-4 | P1 | 30 min |

### LANGUAGE (next prompt)

| # | Fix | Findings | Pri | Time |
| --- | --- | --- | --- | --- |
| L1 | Remove all 106 negative contractions and "We'd"; one constant for "We cannot find that booking"; the payment line changed in the three docs with the code | D | P2 | 1 h |
| L2 | The young person's own 24-hour line message | C-2, D-1 | P2 | 10 min |
| L3 | No credits on the posting screen: point to Credits and Request more credits | D-2 | P2 | 10 min |
| L4 | Next steps on the owner's booking page: when check-in opens, the door check and the code | A2-2 | P2 | 20 min |
| L5 | "What it costs" on the home page: free to young people, R25 a completed tryout for businesses, first 3 free | A3-4 | P2 | 15 min |
| L6 | Buttons: "Mark as paid"; reference failure messages that match what's on screen | D-3, D-4 | P2 | 20 min |
| L7 | Jargon pass: review, held, premises pin, dashboard, Challenge it, strike; "Within 10 km" with the taxi routes; the offer's end with its day; the home page reference step | D-7, A1-5, A1-6, A3-5 | P3 | 30 min |
| L8 | Fallback and rate-limit messages that name the real problem; no developer text to users | D-5, D-6, D-8 | P3 | 30 min |
| L9 | One name each: credits, finished, any more, the payout number; "Did not go ahead" on the status page reworded | D-9, D-10, D-11, D-12 | P3 | 20 min |

### UI (UI sprint)

| # | Fix | Findings | Pri | Time |
| --- | --- | --- | --- | --- |
| U1 | Marketing header: "Sign in" and "Try the demo" on the right | B-1 | P1 | 20 min |
| U2 | A "Demo" label in the app shell whenever a demo account is signed in, and on demo tryout cards | A3-2 | P2 | 30 min |
| U3 | Open Graph image (1200 by 630) and tags on the home and record pages | E-2 | P2 | 30 min |
| U4 | A heading and two labelled choices on the opened demo form | B-7 | P3 | 15 min |
| U5 | Back link on `/bookings/[id]`; dashboard's booked tryout goes to the booking; onward link on status and record error pages | B-4, B-5, A2-5 | P3 | 30 min |
| U6 | One "Booked" on the booking page; hide or mark overlapping tryouts in the feed | A1-7, A1-8 | P3 | 20 min |
| U7 | 1280 px: align the `PageShell` wordmark with its column; centre or fill the closing band; `text-wrap: balance` on the hero | E | P3 | 30 min |
| U8 | Manifest `id`, `scope`, a screenshot, and the right content type | E-5 | P3 | 30 min |
| U9 | Offline page with a minimal service worker (budget checked) | E-4 | P3 | 1.5 h |

**Suggested order for today:** F3, U1 and F15 first (a judge can get in and knows what they're looking at, about 1.5 h), then F1 and F2 (the whole loop, about 3 h), then L1 to L6 and F4 to F6 (about 3 h). Everything else is for the slides' roadmap or after the deadline.
