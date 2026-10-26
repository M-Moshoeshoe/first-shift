# Product rules

Every rule here has its value in `src/config/rules.ts` and its logic in `src/domain`, with unit tests in `tests/unit`. Change a rule in all three places together.

## Pay

| Rule | Value | Code |
| --- | --- | --- |
| Minimum hourly rate | R30.23, the national minimum wage from 1 March 2026 | `pay.ts` |
| Tryout length | 4 to 8 hours | `pay.ts`, `schedule.ts` |
| Minimum paid time | 4 hours, even if less is worked | `pay.ts` |

The app works out what's owed at check-out, so neither side argues about the amount:

| What happened | Pay | Can the owner lower it? |
| --- | --- | --- |
| Finished the work, at any time | Full agreed amount | No |
| Business ended it early, not for safety | Full agreed amount | No |
| Young person chose to leave early | Full amount pre-filled | Yes, to the hours worked (quarter hours), never below 4 hours |
| Either side ended it for safety | Hours worked, at least 4 hours | No; it goes to review |
| Business cancelled late | 4 hours at the agreed rate | No |
| Business didn't open (no-show) | 4 hours at the agreed rate | No; it goes to review |

An owner can always pay more than the amount shown.

## Notice, daylight and booking

| Rule | Value | Why |
| --- | --- | --- |
| Minimum notice | A tryout must start at least 2 hours after it's posted | Time for someone to see it and travel |
| Daylight only | Between 07:00 and 18:00, same day, South African time | Safety on the way there and back |
| Booking cut-off | Bookings close 1 hour before the start | Nobody books a slot they can't reach, and the grace period below always ends before anyone is due |
| No double booking | A young person can't hold two tryouts that overlap | Accepting one withdraws their overlapping applications |
| Locked once booked | Pay, time and tasks can't change after booking | To change them, the owner cancels under the rules below |

## Offers and booking

| Rule | Value | Code |
| --- | --- | --- |
| Ranking | The shortlist of 5 (`ranking.ts`), always with one place kept for someone with no record; then everyone else. Ranked on skill fit (the tryout's kind of work among "What I can do": a full fit; not among them: a low one; not said yet: in between), show-up likelihood (with its reasons) and distance. Each applicant shows their introduction, what they can do, their languages and "Says they can do this kind of work" when it fits; never their surname, ID or number | `applicantRanking.ts`, `skillFit` |
| One offer at a time | The owner offers the tryout to one applicant; another only after a decline or once the offer has lapsed | `offers.ts` |
| Lapsing | An offer lapses at the booking cut-off, an hour before the start | `offerLapsesAt` |
| Accepting books it | Checked again at that moment: booking still open, a credit the business can hold (it's held), no overlap with another booking, and the 24-hour line with this business | `decideAnswer` |
| On booking | Everyone else who applied is "Not selected"; the young person's open applications that overlap are withdrawn | `overlappingApplications` |
| The booking page | Both parties: the exact pin with "Open in maps", names and photos. The owner sees the payout number and can message on WhatsApp; at payment, only the ways the young person chose. The young person sees a 6-digit check-in code and can share their trip | `bookings.ts` |
| Share my trip | A WhatsApp message with a link to a public status page at an unguessable token: first names, the business, the times and the status only, until midnight at the end of the tryout's day | `statusView` |
| Report a problem | On every booking, before, during and after the day, from either side, each with its own kinds: a young person can report harassment, unsafe work, being asked for money, not being paid, or something else; a business, harassment, unsafe work, paying too much, or something else. Harassment, unsafe work and being asked for money pause the business at once | `decideReport`, `reportCategoriesFor` |
| Photos | Your own; an applicant's face for the owner they applied to; each other's once booked, the owner's face included. Through the server only | `mayViewPhoto` |
| Who the young person meets | Once booked, the young person sees the owner's first name and photo, and can message them on WhatsApp at the owner's contact number. Not before | `newBooking`, `bookingView` |

## Cancellations

Cancelling is free until **12 hours before the start, or 15 minutes after booking, whichever is later**.

| Case | Booked | Cancelled | Result |
| --- | --- | --- | --- |
| Planned ahead | Wednesday | Friday evening for Saturday 09:00, more than 12 hours before | Free |
| Planned ahead, late | Wednesday | Saturday 07:00 for a 09:00 start | Late |
| Same day, changed their mind quickly | 06:30 for 09:00 | 06:40, inside the 15-minute grace | Free |
| Same day, after the grace | 06:30 for 09:00 | 07:00 | Late |
| Grace used too often | A fourth grace-only cancellation in 30 days | Inside the grace | Late, so the grace can't be gamed |

Consequences:

- A late cancellation by either side is a strike.
- A business that cancels late also owes the young person 4 hours at the agreed rate. It's shown on the business dashboard and handled like any other payment, so the business is paused until it's paid and confirmed.
- After the start, it's no longer a cancellation. An owner can mark a no-show 30 minutes after the start. A young person can report that the business wasn't open. Both go to review.

## The day

| Step | Rule | Code |
| --- | --- | --- |
| Check-in | The owner confirms the door check (the face matches the photo; the ID card's name and last four digits match) and types the 6-digit code the young person shows. From an hour before the start until the end | `day.ts`, `decideCheckIn` |
| Wrong codes | Counted on the booking; after 5 the booking locks and goes to support, so a code can't be guessed without the young person there | `RULES.checkInCodeAttempts` |
| On time | Checked in by 10 minutes after the start | `wasOnTime` |
| No-show | The owner can record one from 30 minutes after the start if nobody checked in: nothing owed, the credit comes back, a strike for the young person, and a review | `decideNoShow`, `settle()` |
| Business not open | The young person can say so any time after the start if nobody checked them in. It goes to review; nothing is settled until then | `decideBusinessNotOpen` |
| Check-out | The owner picks how it ended: finished the work, done early, the young person left early, I ended it early, or safety; and answers three questions, all required: "On time?", "Did the work as asked?", "Would you hire them again?". `settle()` works out what's owed and uses the credit; a safety stop goes to review | `decideCheckOut` |
| Paying | The owner sends it themselves, by one of the ways the young person chose, then taps Paid with the method, the amount (at least what's owed, lower only when the young person left early, never below 4 hours) and, for the three electronic methods, a payment reference | `decideMarkPaid` |
| Confirming | The young person checks the payment is real (below), then taps Received or Not received. Not received opens a review and pauses the business | `decideConfirm` |
| Deadlines | Checked whenever either party opens a screen, not by a scheduled job: unpaid by 23:59 pauses the business from 00:00 (lifted when it pays), a reminder at 24 hours, a review at 72 hours. Each acts once | `deadlineActions` |

## Payment confirmation

| Step | Rule |
| --- | --- |
| Owner pays | By one of the young person's methods (below), then taps Paid with the amount the app worked out |
| Owner deadline | Payment is due at check-out. Not marked Paid by 23:59 South African time on the day of the tryout pauses the business, from 00:00 |
| Young person confirms | Checks the payment is real for the method used (below), then taps Received or Not received |
| Reminder | At 24 hours without confirmation |
| Review | At 72 hours without confirmation, or straight away on Not received |
| Reference | Issued only after Received |

## Paying: four methods

The business pays the young person directly, by its own means. The same four names are used everywhere (`paymentFlow.ts`, `paymentMethodCopy.ts`):

| Method | To | What it needs | How the young person checks it before tapping Received |
| --- | --- | --- | --- |
| FNB eWallet | Their cellphone number | No bank account; the business must bank with FNB | Dial `*120*277#`, or the free `*130*277#`, for the eWallet balance |
| PayShap | Their cellphone number | Instant; their bank must support PayShap | Their banking app |
| Cash-send | Their cellphone number, from the business's own bank, such as Standard Bank Instant Money or Absa CashSend | An SMS with a PIN | The SMS, but it's real only once an ATM or till pays it out |
| Cash | In person | Nothing | Count it in person |

| Rule | Value | Code |
| --- | --- | --- |
| The young person chooses | "How can businesses pay you?": at least one, in onboarding, and changeable on Profile. Bank account numbers are never asked for | `YoungPersonProfileSchema`, `decideWorkerEdit` |
| Applying | Needs at least one method; profiles from before the question are asked to choose first | `applyState`, `no_pay_methods` |
| A booking keeps them | The methods are copied onto the booking when it's made, like the payout number; a booking from before the question takes any of the four | `newBooking`, `methodsFor` |
| The owner sees only those | At payment, the young person's methods and the payout number. Any other method is refused | `method_not_offered` |
| Payment reference | For the three electronic methods: recommended, plain text, up to 40 characters, shown to the young person. Not kept for cash | `RULES.paymentReferenceMaxChars` |
| Cash | The screen says "Hand over the cash, then ask {name} to tap Received on their phone." | `DAY_COPY.cashHandover` |

## Proof, only in a dispute

| Rule | Value | Code |
| --- | --- | --- |
| When | Only after the young person taps Not received. Never asked for in the normal flow | `decideEvidence`, `not_disputed` |
| What | One screenshot from each side (a JPEG, PNG or WebP image under 2 MB, told by its own first bytes, not by what the browser says) and an optional note of up to 500 characters | `sniffImage`, `RULES.evidenceNoteMaxChars` |
| Where | Sent to the server, which stores it at a private Storage path built from the booking and the side (`evidence/{booking}/{side}-{random}`). No client can read or write it; only an admin, through the Admin SDK | `evidencePath`, `storage.rules`, `firestore.rules` |

## Scam rules

Enforced in code and said in the copy where money appears:

| Rule | How it holds | Code |
| --- | --- | --- |
| Young people never pay anyone to get a tryout | A tryout whose text asks for a fee, a deposit, the young person to pay or buy something, or money sent to the business is refused before the AI sees it, at drafting and at posting. A young person can report "They asked me for money", which pauses the business at once | `scamRules.ts`, `asksForMoney`, `cases.ts` |
| The app never asks anyone to send money back | No screen or route asks a young person for money. When an owner pays more than owed, the young person is told they don't have to send anything back | `DAY_COPY.overpaid`, `DAY_COPY.neverSendBack` |
| Overpayments are handled only by review | The owner reports "I paid too much", which opens a review case and nothing else | `paid_too_much` |

## Paid on time

Tryout cards and the tryout page show the business's record for paying: **Paid on time: N of N**, or **New on First Shift** until a payment has counted. Each tryout's payment counts once (`payRecordCounters`): on Received, on time if it was marked paid by 23:59 on the day it was due; as late when the business was paused for not paying, or the young person said Not received.

## Strikes, pauses and limits

| Rule | Value |
| --- | --- |
| A strike | A no-show, a late cancellation, a false payment claim shown in review, or an upheld safety report |
| Suspension | 3 active strikes; the account is suspended until reviewed |
| Strike expiry | 90 days, so one bad week doesn't end anyone's chances |
| Instant pause | An unpaid tryout or an open safety report pauses a business until resolved |
| Daily limits | 10 applications for a young person, 5 tryouts posted for a business |
| Appeals | Any strike can be overturned on review; overturned strikes stop counting |

The same rules apply to both sides. A paused or suspended user sees why and what resolves it.

## Eligibility and identity

| Rule | This weekend | After the hackathon |
| --- | --- | --- |
| Age | 18 or older, from the ID number | Same |
| SA ID | Structure, date of birth, residency digit and check digit; stored as a hash plus the last four digits | Licensed identity check, funded from fees |
| Other documents | Not yet supported | Refugee IDs, work visas and study visas reviewed by hand; study visas capped at 20 hours a week |
| At the door | Owner matches the face to the photo, checks the ID card's name and last four digits, enters the check-in code | Same |

Accounts and IDs (`roles.ts`, `profileDecisions.ts`):

| Rule | Why |
| --- | --- |
| A role (looking for work, or running a business) is set once and never changed | One account, one side of the deal; using First Shift the other way means a different Google account |
| One ID number, one account | Nobody can open a second account to escape strikes. Owners' IDs are held apart from young people's (`owner:` before the number is hashed), so one person can look for work and run a business, each with one account |
| An ID number is set once per account | A record can't be moved to someone else's identity |
| Sending the same role, or the same ID with the same details, again is fine and changes nothing | A double tap or a retry on weak signal never fails or duplicates anything |
| A wrong ID number is corrected only through support | The person is told to contact us; corrections go through the review list in Phase 7 |

## Demo accounts

| Rule | Why |
| --- | --- |
| Two demo accounts, a business and a young person, with public passwords | Judges walk the loop without a Google account |
| Everything a demo account creates is marked demo; demo accounts see only demo records, real people only real ones (`demo.ts`) | The password is public, so separation, not secrecy, keeps real people safe |
| A demo profile can't be changed from the app | Nobody can put their own name, photo or ID number on a shared account |
| A demo account signs in only through our server | Changing its Firebase password or email from the browser gains nothing |
| `npm run demo:reset` restores the demo world, and so does "Reset the demo" in the app, from a demo account only, at most once a minute for everyone | A clean start before every judging session, and for each judge |
| One tap to sign in: "Try as Thabo, looking for work" or "Try as Sipho, a business" (`POST /api/demo/try`); the email and password still work | Judges get in without typing anything; the passwords are public anyway |
| The demo world starts with two finished, paid, Received tryouts between Sipho and Thabo this month, one with an approved reference (`src/data/demoHistory.ts`) | The work record and its share link have something on them, and the next tryout they finish together brings up the job offer |
| "Skip to the day" on a demo booking, before the door opens, moves its start to 5 minutes ago, keeping its hours (`decideSkipToDay`). Never on a real booking | A judge can try check-in, pay, Received and the reference at any hour |
| The two businesses with no account behind them show "Example, for viewing only" and take no applications (`isExampleOwner`) | Nobody could ever answer an application to them |
| Placeholder photos for the demo faces and shopfronts, plain shapes drawn by the server | The door check and the shortlist have a photo to show |

## Accountability and profiles

Both sides of a tryout know who they're dealing with. What's shown, to whom and when:

| Who | What we ask | Shown to | Kept for an admin only |
| --- | --- | --- | --- |
| Business owner | Full legal name, SA ID number (the same structure and age checks; a hash and the last four digits kept), a face photo taken live, a contact cellphone number; optionally the CIPC registration number | The young person they book, once booked: the first name, the photo and the number (WhatsApp) | Full name, last four digits, number, CIPC number |
| Young person | Legal surname, "What I can do" (1 to 4 of the kinds of work a tryout can be), languages spoken (the 11 official languages and South African Sign Language), a one-line introduction (optional, up to 120 characters) | The owner they apply to: the first name, the introduction, what they can do and the languages. The number once booked, as before | Surname, last four digits, number |

| Rule | Value | Code |
| --- | --- | --- |
| The introduction | Phone numbers (9 or more digits, however written), email addresses, links, websites and social handles are taken out on the server before it's saved, so contact details reach an owner only once they book | `cleanIntro` |
| Owners from before | A business that signed up before the owner was asked sees "Add your details as the owner" and can't post until they're saved (`/business/owner`) | `ownerReady`, `owner_missing` |
| Young people from before | Asked on Profile for their ways to be paid, what they can do, their languages and their surname, and can't apply until they're saved | `needsWorkerUpdate`, `profile_update` |
| A surname is set once | Like the ID number, so a record can't move to another name; corrections through support | `surname_locked` |
| Face photos | Taken live in the app with the camera (the front camera for a face, the back one for a shopfront), with a framing guide and three tips: "Use a plain background", "Face the light" and "No sunglasses or hat". A face can't come from the gallery; a shopfront can. If the camera can't open, the phone's own camera opens instead (a file input with capture set), with one line saying so. We don't try to judge backgrounds or clothing, and we don't run face matching | `CameraView`, `PhotoField` |
| Why an admin keeps them | To find the person behind an account when a safety report, a payment dispute or a strike needs it (`npm run review:case`). The Privacy page will say so (`docs/PHASES.md`, L) | `SECURITY.md`, Privacy |

## Location

A tryout shows where it is as a cell about 1 km across (a 6-character geohash) and the cell's centre, never the business's exact pin. The pin stays on the business record (`geo.ts`).

## Finding and applying

| Rule | Value | Code |
| --- | --- | --- |
| Search point | The young person's area's approximate centre (`src/config/areas.ts`); an area we don't know gives no feed, and the screen says so | `areas.ts` |
| Within reach | 10 km of the area's centre, measured to the tryout's cell centre and shown as "about 4 km"; or any area with a published direct taxi fare from the young person's area, however far, because people make that trip every day (Ivory Park to Randburg: about 21 km, R56 return) | `nearby.ts`, `withinReach` |
| Taxi fares | Published one-way fares only, both directions, each with its source (`src/config/fares.ts`); a route we have no fare for shows "Fare not known" | `fares.ts` |
| What the feed shows | Published tryouts still open for booking, soonest first, in the viewer's world only (demo or real) | `nearby.ts`, `demo.ts` |
| Who may apply | A young person with a complete, active profile, at least one way to be paid, what they can do, their languages and their surname | `applications.ts` |
| When | While the tryout is published and booking is open (until 1 hour before the start) | `applications.ts` |
| One each | One application per young person per tryout; applying again changes nothing | `applications.ts` |
| No overlaps | Never for a tryout that overlaps one they're booked on | `applications.ts` |
| Daily limit | 10 applications a day, counted in South African days | `RULES.applicationsPerDay` |
| A note | Optional, up to 200 characters | `RULES.applicationNoteMaxChars` |
| Withdrawing | The applicant can withdraw, and apply again while booking is open | `applications.ts` |

## Work that can't be posted

The AI sorts every request into a category; `allowedWork.ts` decides. Blocked categories are refused with a safer option, whatever the AI's confidence. Unclear requests (confidence below 0.7) wait for human review. Electrical installation is blocked because the Electrical Installation Regulations, 2009 require it to be done under the control of a registered person.

## References and the work record

| Rule | Value | Code |
| --- | --- | --- |
| Written from | The owner's three answers and the tryout's tasks, nothing else: no name, no ID, no number reaches the model. The wording is AI's, labelled "Written with AI from the business's answers." | `writeReferencePrompt`, `newReference` |
| When | Only after the young person taps Received, once per booking, as soon as they open it (or "Write my reference" if the AI didn't answer). Counts against the daily AI limit. A failure writes nothing | `referenceDraftProblem` |
| The young person decides | They see the three answers as the criteria and the wording, then tap "Add to my record" or "Challenge it" with a reason, which opens a review case. Owners can't edit a reference once written; there is no route for it | `decideReference` |
| On review | A challenge upheld takes the reference off for good; a challenge rejected gives it back to the young person to add or leave off, and it can't be challenged again | `review.ts`, `challengeRejected` |
| The record | `/work/record`: every tryout paid and confirmed by both, as a verified entry (business, date, hours, "Paid, confirmed by both"), with its reference once approved. Hours are the agreed hours, or the hours worked when the young person left early or it ended for safety | `recordEntries`, `recordHours` |
| Sharing | A link at an unguessable 144-bit token (`/record/{token}`), made on the first visit to the record: the first name and the verified entries with approved references only. Never an ID, a surname or a phone number. No sign-in; not in search results; a plain Open Graph title and description | `sharedRecord`, `isRecordToken` |

## Hiring

| Rule | Value | Code |
| --- | --- | --- |
| When it's offered | After a tryout ends, if the pair has 3 completed tryouts together, or even a 4-hour tryout more this month would reach the 24-hour line, the owner sees "Offer {name} a job" on the booking | `hireOfferDue` |
| What it does | Records the offer once per pair (counted in `npm run pilot:metrics`), then the owner sends a prefilled WhatsApp message they can change. The young person sees "Job offer from {business}" under Applications | `hireOffers`, `HIRE_COPY` |

## The review list

`npm run review:case` (admin only, needs the Admin credentials): open cases by priority (safety, then payment, then references, then tryouts and credit requests, oldest first within each), each case's full context (both profiles, the booking timeline, the payment, the evidence, earlier cases and strikes), and resolving one with an outcome and the reasoning. Actions: pause or unpause either side, add or overturn a strike, uphold or reject a reference challenge, grant credits. Every action is audit-logged under the admin's name with the reasoning (`review.ts`, `reviewService.ts`).

`npm run pilot:metrics` reports, per week and in total, from real records only: tryouts completed and paid, the paid-on-time rate, repeat businesses, safety reports by kind and how long they took to close, references approved and challenged, and job offers (`pilotMetrics.ts`).

## Tryout credits

A business pays for tryouts with prepaid credits (`credits.ts`), so nobody has to chase fees after the day.

| Rule | Value |
| --- | --- |
| Free credits | 3, granted once when the business profile is first complete |
| Price | R25 a credit |
| The rule | A credit is used whenever the young person is owed money, and returned when nothing is owed (`settlement.ts`; every case in `docs/MONEY.md`) |
| Posting | Allowed while any credit is available. Drafting is refused without one, so no AI work is wasted |
| Booking | Needs an available credit, and holds it (wired in with booking) |
| Available | Granted, minus used, minus held |
| Expiry | Credits never expire |
| The Credits screen | In the business's tab bar: credits available, held for booked tryouts and free credits left (free credits are spent first), and the history in plain words: added, held, used, returned and requested | `freeLeft`, `creditHistory` |
| Asking for more | "Request more credits" opens a case for an admin, once: tapping again shows "Requested on {date}. We'll add them and let you know." An admin adds them with `npm run credits:grant` (1 to 50 at a time, always with a reason, audit-logged under the admin's name), which closes the request | `decideCreditRequest`, `decideAdminGrant` |
| Top-ups | Not open yet, so there's no payment button. The screen says, as text only: "At launch: 5 tryouts for R125 or 10 for R250, by card or Instant EFT." Unused paid credits will be refundable on request, less the gateway fee | `CREDITS_COPY.launch` |

The ledger is append-only: entries are only ever added, by the server, in the same transaction as the event that causes them, each with an audit entry.
