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

## Payment confirmation

| Step | Rule |
| --- | --- |
| Owner pays | By eWallet, bank transfer or cash, then taps Paid with the amount the app worked out |
| Owner deadline | Not marked Paid within 24 hours of check-out pauses the business |
| Young person confirms | Checks their real balance (`*120*277#` for eWallet), then taps Received or Not received |
| Reminder | At 24 hours without confirmation |
| Review | At 72 hours without confirmation, or straight away on Not received |
| Reference | Issued only after Received |

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
| One ID number, one account | Nobody can open a second account to escape strikes |
| An ID number is set once per account | A record can't be moved to someone else's identity |
| Sending the same role, or the same ID with the same details, again is fine and changes nothing | A double tap or a retry on weak signal never fails or duplicates anything |
| A wrong ID number is corrected only through support | The person is told to contact us; corrections go through the review list in Phase 7 |

## Work that can't be posted

The AI sorts every request into a category; `allowedWork.ts` decides. Blocked categories are refused with a safer option, whatever the AI's confidence. Unclear requests (confidence below 0.7) wait for human review. Electrical installation is blocked because the Electrical Installation Regulations, 2009 require it to be done under the control of a registered person.

## Hiring and fees

- After 3 completed tryouts with the same person, the owner is asked "Offer a job?", once.
- Fees due: R25 per completed tryout, shown to each business. Nothing is collected during the hackathon.
