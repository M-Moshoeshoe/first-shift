# AGENTS.md: engineering standard for First Shift

Read this file in full at the start of every session. Every change must comply with it. If a request conflicts with this file, say so before writing code.

## The product, in one paragraph

First Shift connects young South Africans with paid one-day tryouts at small businesses near them. A business posts a tryout in one sentence; a young person nearby applies, works the day, gets paid directly by the business (FNB eWallet, bank transfer or cash), and receives a reference written from the owner's answers. Every tryout adds a verified line to the young person's work record. Built for the FNB App of the Year Hackathon 2026, Youth employment and work readiness track.

## Sources of truth

- `docs/RULES.md` explains every product rule in plain language.
- `src/config/rules.ts` holds every rule as a value. Domain code reads these values and never hard-codes them.
- `docs/DESIGN.md` holds the design tokens, type scale and copy rules.
- `docs/PHASES.md` defines the build order. Work one phase at a time.
- `SECURITY.md` is the SSDLC. Keep it in step with the code.

## Architecture

```
src/app/layout.tsx   root layout: html, body and tokens only, no auth
src/app/(marketing)/ public pages; never load auth or Firebase code
src/app/(account)/   sign-in, onboarding, work, business; wrapped in AuthProvider,
                     work and business behind ProfileGate
src/app/api/         thin route handlers
src/components/ui/   shared primitives: Band, PageShell, Button, fields, Stamp
src/components/      presentational components used by two or more features
src/domain/          pure business rules, no I/O, fully unit tested
src/config/          rule values, AI settings and the theme colour
src/schemas/         Zod schemas shared by client and server
src/server/          server-only adapters: Firebase Admin, auth, Claude, rate limits, logs
src/server/services/       coordinate one use case: call domain to decide, a repository to write
src/server/repositories/   storage behind small interfaces (Firestore, Storage); fakes in tests
src/lib/             client-only helpers (Firebase web SDK)
src/data/            demo data, always marked demo: true
tests/unit/          domain tests
tests/rules/         security rules tests
```

Dependency direction is one way: `app` and `components` may use `domain`, `schemas`, `config`, `server` (in route handlers) and `lib`. `server` may use `domain`, `schemas` and `config`. `domain` uses only `config` and itself, plus a pure library with no I/O and no dependencies of its own where one saves real work (today only `geofire-common`, for geohashes). ESLint enforces these boundaries; never disable the rule to get around it.

A route handler does four things, in order: verify the user (`requireUser`), validate input (a Zod schema), call a service (or domain functions directly, for a one-step route), then respond, with every error through `toErrorResponse`. Business decisions never live in a route handler or a component.

Services only coordinate: every decision comes from `src/domain`. No business rules in services or repositories. A repository applies a change and its audit entry in one transaction, so one can't happen without the other.

Folders and files:

- Marketing pages never load auth or Firebase code. Check the home page's JavaScript in the build output after any change to `(marketing)` or the root layout.
- Components used by one screen live in that segment's `_components/` folder. Move a component to `src/components` only when two or more features use it.
- One component per file. PascalCase file names for components, camelCase for modules. No barrel `index.ts` re-export files.
- `scripts/` holds tools (seed, budget, end-to-end checks). App code never imports from it; ESLint enforces this.

## Engineering standard

- Senior, production-ready code. Clarity over cleverness.
- Clean architecture and separation of concerns. No God files or God components: ESLint fails any file over 250 lines; split by responsibility before you get there.
- DRY, KISS, YAGNI. No speculative abstractions, patterns or dependencies.
- Don't add a file without a reason that fits the architecture above. Prefer improving what exists.
- Strict TypeScript. No `any`. No non-null assertions to silence the compiler.
- Money is always integer cents (`Cents`). Format only at the edge with `formatRand`.
- Times are stored as UTC instants. Use `src/domain/time.ts` for South African wall-clock logic (SAST is UTC+2, no daylight saving).
- Every pure function gets unit tests, including the edge cases in `docs/RULES.md`.
- Performance on cheap phones and weak signal is a first-class requirement: system fonts, no heavy images, no animation libraries, lean bundles.
- Accessibility is required: semantic HTML, labels on every input, visible focus, 44 px tap targets, contrast from `docs/DESIGN.md`, reduced motion respected.
- Motion is limited to the eight listed in `docs/DESIGN.md`. Scroll reveals and load animations are banned on app screens; content in tools appears instantly.
- Refactor only when it improves structure, never at the cost of behaviour.

## React Aria: one use only

- React Aria Components is used for exactly one thing: the withdraw confirmation on `/business` (its Modal and Dialog), styled as a bottom sheet that uses our sheet-enter and sheet-exit motions through its entering and exiting states.
- Import per component (`react-aria-components/Modal`), never from the package root. Pin the version under the dependency rules above.
- Style it only with our tokens through its data attributes (`[data-entering]`, `[data-exiting]`, `[data-pressed]`, `[data-focus-visible]`). No default React Aria styles, and no motion outside `docs/DESIGN.md`.
- Measure the JavaScript it adds and keep `/business` within its budget.
- Never use it anywhere else, and never replace an existing primitive with it. Dates and times use native inputs, which open the phone's own pickers at no JavaScript cost; never its DatePicker or TimeField.
- Area fields use `AreaField`: a native input with a `<datalist>` of known areas from `src/config/areas.ts`, not its ComboBox. The datalist won on budget and behaviour: it adds no JavaScript to onboarding pages that sit within 8 KB of the 260 KB cap, it gives the phone's own suggestion list, and typing any area still works. The server stores known areas under their official name with `canonicaliseArea()` (`src/domain/areas.ts`).

## Security and data (see SECURITY.md)

- Firestore and Storage rules deny by default. All writes go through server routes using the Admin SDK. Clients only read what they need for live updates. Every rules change ships with a rules test.
- One documented exception: the browser uploads profile and shopfront photos straight to `photos/{uid}/{kind}.jpg` in Storage (own folder, images only, under 2 MB, enforced by `storage.rules`). The upload alone changes nothing. The photo route builds the path from the signed-in uid, never from the request, reads the file's metadata through Admin Storage, confirms the content type is JPEG, PNG or WebP and the size is under 2 MB, and only then saves the path.
- Every write to a profile adds an `auditLog` entry (uid, action, time; no personal data) in the same transaction as the change.
- Secrets live only in environment variables on the server. Never put a key in client code or in Git. `NEXT_PUBLIC_` is for the Firebase web config and the emulator switch only.
- The emulator switch (`NEXT_PUBLIC_USE_EMULATORS`) connects the browser to the local Firebase emulators only when it is `"true"` and the page is served from `localhost` or `127.0.0.1`, so a flag left on in production does nothing. `/api/health` reports it.
- Validate every boundary with Zod: request bodies, AI output, query parameters.
- No silent failures. Every rejected write and every AI failure is logged with `log()` and shown to the user with a clear next step. Fail closed: an error blocks the action, it never skips a check.
- POPIA: collect the minimum. ID numbers are stored only as an HMAC hash plus the last four digits. No face matching. No personal data in logs (`log()` redacts it) or in AI prompts.
- Rate limits on every AI route and on applying and posting, from `RULES`.
- Dependencies: exact versions and a committed lockfile. Don't adopt a release newer than 14 days, except a patch that fixes a published security advisory, which we take immediately. When a library pins a vulnerable package we can't upgrade directly, use an `overrides` entry in `package.json` and note why in `SECURITY.md`. `npm audit` must report zero vulnerabilities before every push.

## AI rules

- Claude drafts, classifies and writes. Code decides. The pay floor, the allowed list, the notice rules and every status change are enforced in `src/domain`, never in a prompt.
- User text goes in `<owner_text>` tags as data. The system prompt holds no secrets and no safety rules.
- Every AI response is parsed with its Zod schema. Anything that doesn't match is rejected (`askForJson` does this).
- References come only from the owner's three answers and the listed tasks.

## Copy rules (no AI tells)

- Plain words a 19-year-old in Tembisa would use. Sentence case. Active voice. Buttons say what happens ("Post tryout", then "Tryout posted").
- No em dashes, no emoji, no sparkle icons, no "AI-powered" badges, no "unlock", "empower", "seamless", "revolutionise" or "journey".
- No all-caps labels, no eyebrow labels above headings, no middle-dot separators, no arrows appended to buttons.
- No `rounded-*` class of any kind, including `rounded-full` and arbitrary values, which still work in Tailwind v4 without the radius tokens. Edges are sharp and photos are square; no circles anywhere (`docs/DESIGN.md`).
- Prices in rand from `formatRand`. Real local names: Thabo, Lerato, Ayanda, Sipho; Ivory Park, Tembisa, Midrand.
- Errors say what went wrong and how to fix it. They never apologise and are never vague.
- Never describe Mokhachane as a founder anywhere in the product or docs. He is the developer.

## Lessons from past builds, now rules

1. A permissive Firestore rule once let one role read another's data. Rules deny by default and are tested for every role before every deploy.
2. A form silently dropped enquiries while a check returned success. No failure may look like success; test end to end like a real user.
3. DNS and SSL waits on a custom domain cost hours. Ship on the Netlify default subdomain.
4. Test flags were left on in production. Flags live in environment config and appear on the pre-submit checklist.
5. A single-file prototype was rebuilt from scratch. Start in this structure; never prototype outside it.
6. A feature was promised against an API nobody had seen. Build only on what we control; the FNB eWallet API is a roadmap ask, not a dependency.
7. `curl` behaves differently in PowerShell. Use Git Bash, or `curl.exe`.
8. A blanket 14-day wait on new releases nearly shipped a critical remote-code-execution flaw in Next.js. Security patches skip the wait, and `npm audit` runs before every push.

## How we work

- One phase at a time from `docs/PHASES.md`. Before coding, restate the phase goal and list the files you'll touch. After coding, run `npm run check` and summarise what changed and why.
- Small commits with plain messages ("Add tryout posting route"), one concern each.
- Git workflow: work one step at a time; show the step's changes with `git diff`; commit at the end of the step only after the go-ahead, with a plain message naming the step ("Phase 1 step 5: young person onboarding"). Before every commit, check `git status` and the staged content: no `.env.local`, service account or keystore files, and no secret in any staged file: a PEM private key block, a Google API key or an Anthropic key.
- Never commit `.env.local`, keystores or service account files.
- Definition of done for any phase: lint, typecheck, unit tests and build pass; new rules have tests; the screen works on a 360 px wide viewport with a throttled connection; copy follows the rules above.

## Pre-submit checklist

- [ ] `npm run check` passes and `npm run rules` passes
- [ ] `/api/health` on the live URL reports every integration configured
- [ ] Both demo accounts work and demo mode walks the whole loop
- [ ] No test flags on in production; demo data labelled everywhere it appears
- [ ] ZAP baseline scan on the live URL reviewed
- [ ] Throttled-phone test passed
- [ ] `npm run budget` passes (part of `npm run check`)
- [ ] Emulators off: `/api/health` on the live URL reports `"emulators": false`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
