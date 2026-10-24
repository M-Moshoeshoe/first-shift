# Build phases

Work one phase at a time. Each phase ends with `npm run check` passing, a short summary of what changed, and a review against `AGENTS.md` before the next phase starts. The detailed prompt for each phase is pasted into Claude Code when the phase begins.

| Phase | Goal | Done when | Weekend slot |
| --- | --- | --- | --- |
| 0 | Skeleton: structure, tested domain rules, security rules, CI, docs | `npm run check` passes | Done |
| 1 | Sign-in, role choice, profiles: Google sign-in, ID check, photo upload, business profile | Both roles can sign in and create a profile on a phone | Friday night |
| 2 | Posting: one-sentence post, AI draft, allowed-work check, pay floor, notice rule, business dashboard | A real owner can post a tryout that passes every rule | Friday night |
| 3 | Finding: live nearby feed with fares, tryout detail, applying with daily limits, push alerts | A young person sees a new tryout appear and applies | Saturday morning |
| 4 | Choosing and booking: ranked short list with show-up likelihood and the first-timer place, booking, check-in code, WhatsApp chat and trip share | An owner books an applicant and both see the booking | Saturday afternoon |
| 5 | The day and paying: door check, check-in, check-out, pay rules, Paid and Received | A tryout runs from check-in to Received | Sunday morning |
| 6 | Records: three answers, AI reference, blind ratings, shareable record, hire prompt, fees due | A reference appears on the record after Received | Sunday morning |
| 7 | Fair play: cancellations, strikes, pauses, limits, review list, audit log | Every rule in `docs/RULES.md` is enforced by a route | Sunday afternoon |
| 8 | Demo mode and polish: role switch, seeded stages, installable app, offline screen, accessibility pass, a Contact page (the support email) and a Privacy page (what we collect, why, how to delete it, and the support email) | One judge can walk the whole loop alone in a few minutes | Sunday afternoon |
| 9 | Security pass and launch: rules tests, ZAP scan, pen-test checklist, prompt-injection set, deploy | Pre-submit checklist in `AGENTS.md` is ticked | Monday |

Stretch, only if Phase 8 is polished by Sunday 17:00: the fill forecast, then a signed APK.

Hard deadlines to plan around: SSDLC on Saturday at 12:00 (use `SECURITY.md`), the 20-second video on Saturday before 13:30, the Lean Business Canvas on Sunday at 12:00, and the final submission on Monday at 23:59.
