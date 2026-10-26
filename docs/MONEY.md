# Money flows

How money and credits move when a tryout ends, in one rule, and what each completed tryout earns. The code is `src/domain/settlement.ts` (`settle`), built on `pay.ts` (every pay amount), `credits.ts` (the ledger) and `cancellation.ts` (free or late). `tests/unit/settlement.test.ts` has a test for every row below.

## The rule

**A credit is used whenever the young person is owed money, and returned when nothing is owed.**

A business pays First Shift only for tryouts that cost the young person a day, or a trip, they were promised. So:

- the young person is never left unpaid for a day they gave, or a trip they made, and
- a business never pays for a tryout that didn't happen through no fault of its own.

The credit effect isn't listed case by case in the code: `settle` works out the wage, and the credit follows from it.

## Every ending

| What happened | Owed to the young person | Credit | Strike |
| --- | --- | --- | --- |
| Completed | Full pay | Used | None |
| Finished early | Full pay | Used | None |
| Young person leaves early by choice | Full pay pre-filled; the owner may lower it to the hours worked (quarter hours), never below 4 hours | Used | None |
| Business ends it early, not for safety | Full pay | Used | None |
| Ended for safety, by either side | Hours worked, at least 4; goes to review | Used | None |
| Business cancels late | 4 hours' pay | Used | The business |
| Business doesn't open (no-show) | 4 hours' pay; goes to review | Used | The business |
| Free cancellation, by either side | Nothing | Returned | None |
| Young person cancels late | Nothing | Returned | The young person |
| Young person doesn't show up | Nothing | Returned | The young person |

Whether a cancellation is free or late is decided by `cancellation.ts` (free until 12 hours before the start, or 15 minutes after booking, whichever is later; see `docs/RULES.md`).

## Credits

| Rule | Detail |
| --- | --- |
| Free credits | 3, granted once when a business profile is first complete |
| Price | R25 a credit |
| Posting | Allowed while any credit is available |
| Booking | Needs an available credit; booking holds it (`decideHold`) |
| Settling | The held credit is used or returned, by the rule above (`settlementCredit`) |
| Available | Granted, minus used, minus held |
| Expiry | Never. Credits don't expire |
| More credits | Until top-ups open: the business taps "Request more credits", an admin adds them with `npm run credits:grant` (audit-logged, with a reason) and the request closes. At launch: 5 for R125 or 10 for R250, by card or Instant EFT |
| Refunds | Unused **paid** credits are refundable on request. The payment gateway's fee isn't refunded. Free credits have no cash value. Not built yet; recorded here for when top-ups open |

The ledger is append-only: entries are only added, by the server, in the same transaction as the event that causes them, each with an audit entry (`SECURITY.md`, A08).

## Unit economics

Per completed tryout, once a business is past its free credits:

| Line | Amount |
| --- | --- |
| Credit price | R25.00 |
| Payment gateway fee, about | -R1.40 |
| AI (drafting and two safety checks on Claude Haiku 5.5), about | -R0.10 |
| **Earned, about** | **R23.50** |

The young person's pay never passes through First Shift: the business pays them directly, by one of the four methods the young person chose (FNB eWallet, PayShap, a cash-send from the business's own bank, or cash; `docs/RULES.md`, Paying), so there's no float to hold and no payout fee.

**Free credits.** Each business's first 3 tryouts are free, which costs about R75 in fees not earned per business that uses them all. They're paid for by what that business brings in after: the 4th completed tryout and later. The AI cost of a free tryout (about R0.10) is still spent.

**AI cost guards.** Drafting is refused before any AI call when a business has no credit available, and both drafting and posting are rate limited (`RULES.postsPerDay`, the daily AI allowance), so a business can't run up AI cost without paying.

The gateway fee and AI cost are estimates from list prices on 25 October 2026. Measure them against real invoices once top-ups open.
