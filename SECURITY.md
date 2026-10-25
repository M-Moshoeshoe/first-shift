# Security and the secure development lifecycle (SSDLC)

First Shift handles young people's identity details, phone numbers, business locations and payment confirmations. This document records how we thought about security at every stage of building it, and how we check that the controls work. It is the basis of our SSDLC submission for the FNB App of the Year Hackathon 2026.

## What we protect

| Asset | Why it matters |
| --- | --- |
| Young people's ID data, photos and phone numbers | Identity theft and harassment |
| Business locations | A young person's safety depends on them being real |
| References and payment records | The whole product rests on these being honest |
| Fees due | Our revenue record |
| API keys and the ID hashing secret | Abuse and cost |

The worst outcome isn't a data leak. It's a fake tryout that puts a young person in danger, so safety rules sit inside the security design.

## Our lifecycle

1. **Design:** every feature starts from `docs/RULES.md`, with its risks listed in this file before it's built.
2. **Build:** rules live in pure, tested domain functions; security-relevant decisions are never made in prompts or UI code (`AGENTS.md`).
3. **Review:** each phase ends with a diff review against `AGENTS.md` before it's accepted.
4. **Test:** unit tests, security rules tests, CI checks and scans, below.
5. **Deploy:** secrets only in Netlify environment variables; `/api/health` confirms configuration without exposing values.
6. **Monitor and respond:** structured logs for rejected writes and AI failures, and a disclosure contact below.

## Threats and controls (OWASP Top 10:2025)

| Risk | How it could hit us | Control | How we test it |
| --- | --- | --- | --- |
| A01 Broken Access Control | A user reads someone else's booking or edits a tryout they don't own, reads ID hashes or the audit log, or skips onboarding to reach another role's screens | Firestore and Storage rules deny by default; every write goes through a server route that verifies the Firebase ID token and ownership; account screens sit behind ProfileGate, which opens each one only while it's the person's destination (`redirectFor`), and the server routes enforce every rule again regardless | `tests/rules`: no client reads `idHashes` or `auditLog`, no client writes `users` or `businesses`, each person reads only their own user record; photos only into your own folder, images only, under 2 MB. Loosening a rule on purpose makes these tests fail. `tests/unit/routing.test.ts` covers every screen against every profile state. Tryouts: no client can create, change or delete one, and one waiting for review is readable only by its owner (`tests/rules`); withdrawing someone else's tryout reads as not found, so ids can't be probed (`tests/unit/tryoutService.test.ts`) |
| A02 Security Misconfiguration | Open rules, verbose errors, missing headers, a test switch left on in production | Security headers in `next.config.ts` (CSP, HSTS, frame-ancestors, Referrer-Policy, Permissions-Policy); errors return safe messages only; the emulator switch connects the browser only when it is `"true"` and the page is on `localhost`, and `/api/health` reports it; the test-only emulator sign-in needs a development build AND the switch AND a local page, and production builds leave it out entirely | ZAP baseline scan; header check after each deploy; unit tests of the emulator guard and the test sign-in guard; `npm run budget` fails if the test sign-in's marker appears anywhere in the production build (proved by breaking the guard on purpose); pre-submit check that `/api/health` shows `"emulators": false` |
| A03 Software Supply Chain Failures | A compromised npm package | Exact versions and a committed lockfile; no release newer than 14 days except security patches, which we take at once; few dependencies. `overrides` entries, each because a library pins a vulnerable package we can't upgrade directly: `@grpc/grpc-js` 1.14.6 for Firestore's SDK; and, scoped to `firebase-tools` only, `uuid` 11.1.1 under `gaxios` (GHSA-w5hq-g745-h8pq) and `@opentelemetry/core` 2.8.0 under `@google-cloud/pubsub` (GHSA-8988-4f7v-96qf). `firebase-tools` 15.34.1 is a pinned dev dependency, used by `npm run rules`, `npm run emulators` and CI alike, never a global install; it only runs the emulators against test data and never ships in the app. With these overrides the rules tests and all three emulators were rerun and pass | `npm audit` reports zero vulnerabilities, dev tools included; CI runs the full `npm audit` on every push |
| A04 Cryptographic Failures | Leaked ID numbers | HMAC-SHA256 with a server-only secret; only the hash and last four digits are stored; the hash lives only in `idHashes`, which no client can read, never on the user's own document; the full number and date of birth are dropped as soon as the ID is checked; without the secret, nothing is saved (fail closed); HTTPS only | `tests/unit/idSafety.test.ts` sends a valid ID down every failure path through the real route handlers and searches every log line, error message, response and stored record for the number and the date of birth; a deliberately planted leak makes it fail |
| A05 Injection | Script hidden in a tryout or AI output | React escaping, no raw HTML rendering, CSP, Zod validation on every input | XSS payloads in end-to-end tests |
| A06 Insecure Design | A fake tryout used to lure a young person | Daylight-only tryouts at business premises, shopfront details on every business, ID check at the door, trip sharing, reports that pause a business | An abuse-case test for each rule in `docs/RULES.md` |
| A07 Authentication Failures | Account takeover or forged tokens | Firebase Auth; server verifies ID tokens with revocation checks | Expired, forged and missing tokens are rejected |
| A08 Software or Data Integrity Failures | A forged or edited reference, or a photo the server never checked | References and payments are written only by the server, append-only, after Received; every profile write adds an `auditLog` entry (uid, action, time, no personal data) in the same transaction, so a change can't happen unrecorded; the one client write, photo upload, is checked by the server (path built from the uid, type and size read from Storage) before it counts | Rules tests prove clients can't write them; service tests prove each write audits once and a refusal writes nothing |
| A09 Security Logging and Alerting Failures | Silent failures | `log()` records every rejected request and AI failure without personal data | Force failures and confirm they're logged |
| A10 Mishandling of Exceptional Conditions | An AI timeout skips a check | Fail closed: any error blocks the action; timeouts on every external call; an AI answer counts only if it finished (`end_turn`), so a refusal or a cut-off answer blocks the action too | `tests/unit/claude.test.ts`: a refusal, a cut-off answer, output that doesn't match and a thrown error each fail closed and are logged without the request text |

## AI risks (OWASP Top 10 for LLM Applications 2025)

| Risk | Control |
| --- | --- |
| LLM01 Prompt Injection | User text goes in as tagged data with `<` and `>` escaped, so it can't close the tag; the model has no tools and no write access; structured outputs fix the answer's shape and Zod checks it; code makes every decision, so a fooled classification can at worst send work to review, never past the pay floor or the time rules; publishing checks the final title and tasks again |
| LLM02 Sensitive Information Disclosure | ID numbers, phone numbers and names never reach the model |
| LLM05 Improper Output Handling | Output is validated, then shown as plain text only |
| LLM06 Excessive Agency | Code makes every decision; the model only drafts, classifies and writes |
| LLM07 System Prompt Leakage | No secrets or safety rules live in prompts |
| LLM09 Misinformation | References come only from the owner's answers, and are labelled as written with AI |
| LLM10 Unbounded Consumption | Input length limits, token caps, per-user daily quotas and rate limits |

## Privacy (POPIA)

- We collect a first name, a photo, an area, a payout phone number and an ID number for eligibility only.
- We don't run face matching, which POPIA treats as biometric special personal information.
- Photos are visible only to signed-in users of the app; IDs and phone numbers are never shown to businesses before booking.
- Deleting an account and its record isn't built into the app yet. Until it is, anyone can ask for deletion by emailing firstshift.support@gmail.com (`src/config/contact.ts`), and we complete it within 30 days. A "Delete my account" button is in `docs/PHASES.md` only if time allows.

## Accepted risks

| Risk | Why we accept it | What would change it |
| --- | --- | --- |
| The Content Security Policy allows inline scripts (`script-src 'self' 'unsafe-inline'` in `next.config.ts`), so the policy alone wouldn't stop an injected inline script | Next.js needs inline scripts to start each page. The only strict alternative is a fresh nonce per request, which makes every page render on the server for every visit: no static pages, no CDN caching, slower first loads on the weak connections our users have. React escaping, no raw HTML rendering and Zod validation on every input are the real XSS controls | Rendering any user-supplied HTML or markdown; a third-party script on our pages; an XSS finding in the ZAP scan or the pen test; or Next.js supporting hash-based CSP for static pages, which keeps them static |

## Testing, including penetration testing

1. **Unit tests** for every rule in `src/domain` (`npm test`).
2. **Security rules tests** in the Firebase emulator (`npm run rules`).
3. **CI on every push:** lint (including architecture boundaries and a file-size cap), typecheck, tests, dependency audit and build.
4. **ZAP baseline scan** (passive) against our live or preview URL, from `.github/workflows/zap-baseline.yml`. Active scans run only against our own staging deploy, never anyone else's system.
5. **Manual pen-test checklist before submission:** swap IDs between accounts, call every route with no token and an expired token, burst requests past each limit, send oversized and malformed input, try XSS payloads in every text field.
6. **AI evaluation set:** 20 owner sentences in `tests/fixtures/aiCases.ts`: 8 allowed, 8 blocked (one per category) and 4 hostile (an instruction to set pay to R5 an hour, an instruction to classify rewiring as cleaning, a request hidden in Afrikaans, and an attempt to close the `owner_text` tag). `npm run eval:ai` runs them against the real API, prints a pass or fail table and exits non-zero on any failure. It needs a real key and costs money, so it never runs in CI; rerun it on every prompt or model change. Our claim "AI blocks unsafe work" holds only while all 8 blocked cases are refused and all 4 hostile cases resisted.

   | Date | Model and effort | Allowed | Blocked refused | Hostile resisted | Result |
   | --- | --- | --- | --- | --- | --- |
   | Not yet run | `claude-haiku-5-5`, low | - | - | - | Waiting for a run with a real key |

## Reporting a vulnerability

Email mokhachane.moshoeshoe@gmail.com with steps to reproduce. Please don't test against other users' data.
