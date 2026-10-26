# Audit: the real state of First Shift

> A dated snapshot: what was true at the commit named below. It is kept as a record and isn't updated; the code and the other documents have moved on since.

Read-only audit, Sunday 25 October 2026, 00:10 SAST, at commit `f95fd11` (tag `phase-1` is `905be2b`). Nothing in the code was changed. Evidence was gathered by reading every file in `src/`, running `npm run check`, `npm run rules`, the e2e scripts, knip, and 66 screenshots in Microsoft Edge.

The short version: the foundations are strong (rules, security, tests, architecture), but the product a judge can use today is sign-in plus two onboarding forms that end on placeholder screens. Not one tryout can be posted, found, booked or paid yet. About 48 hours remain.

## A. Screens and navigation

### Routes

| URL | Purpose | Status | Who can reach it |
| --- | --- | --- | --- |
| `/` | Marketing home: hero, example slip, how it works, three pitches, two calls to action | Working | Everyone |
| `/sign-in` | Continue with Google (plus the test-only emulator sign-in under `next dev`) | Working with the emulators. Real Google sign-in has never been tried | Signed-out people; anyone signed in is sent on to their destination |
| `/onboarding/role` | Choose "I'm looking for work" or "I run a business", once | Working | Signed in, no role yet |
| `/onboarding/work` | Young person profile: details, ID number, photo | Working | Young person, profile unfinished |
| `/onboarding/business` | Business profile: details, premises pin, shopfront photo | Working | Business, profile unfinished |
| `/work` | Young person home | Placeholder: a greeting, "Paid tryouts near you will show up here soon." and Sign out | Young person, profile finished |
| `/business` | Business home | Placeholder: the business name, "You'll post your first tryout from here soon." and Sign out | Business, profile finished |
| `/business/post` | Posting a tryout (Phase 2 step 4) | Does not exist | |
| Any other URL | Next.js default 404 | Off-brand: no wordmark, no link home | Everyone |
| `/api/health` | Which integrations are configured, and whether emulators are on | Working | Everyone |
| `GET /api/profile` | The person's own profile and destination | Working | Signed in |
| `POST /api/profile/role`, `/worker`, `/business`, `/photo` | Profile writes, each audit-logged | Working | Signed in, role-checked on the server |

Missing pages the plan promises: Contact, Privacy (Phase 8, and POPIA expects a privacy notice), an offline page, `error.tsx` (an uncaught render error shows Next's default error screen), and `not-found.tsx`.

### Screenshots

66 screenshots, every route in every reachable state, at 360 px (2x, touch) and 1280 px, taken against `next dev` and the emulators. The red bar at the bottom of account screens is the Firebase emulator's own warning; it doesn't exist in production. Reduced motion was on for every capture except the home page's first view, so scroll reveals didn't hide content. No screen scrolls sideways at either width.

Folders: `C:\Users\HP\AppData\Local\Temp\first-shift-audit\360\` and `...\1280\`, with `index.json` listing every file. Each folder holds the same 33 states:

| Route | States captured (file name `<route>__<state>.png`) |
| --- | --- |
| `/` | `___first-view`, `___full-page` |
| `/no-such-page` | `_no-such-page__404` |
| `/sign-in` | `signed-out`, `loading-after-sign-in`, `error-profile-unavailable` |
| `/onboarding/role` | `loading`, `ready`, `error-saving`, `error-profile-unavailable` |
| `/onboarding/work` | `step1-empty`, `step1-errors`, `step1-filled`, `step2-empty`, `step2-error-invalid-id`, `step3-empty`, `step3-error-no-photo`, `step3-photo-chosen`, `done-stamp` |
| `/work` | `home`, `loading`, `error-profile-unavailable` |
| `/onboarding/business` | `step1-empty`, `step1-errors`, `step1-filled`, `step2-pin`, `step2-pin-refused`, `step2-pin-set`, `step3-empty`, `step3-photo-chosen`, `done-stamp` |
| `/business` | `home`, `loading` |

Not captured, because they can't be forced without code changes: the Google popup and its "popup blocked" error, the upload progress percentage, an imprecise pin, and the ID-in-use refusal. There is no "empty" state anywhere yet, because no screen lists anything.

### Navigation map

```
/ ──"Find a paid tryout"──> /work ──(signed out)──> /sign-in
  ──"Post a tryout"──────> /business ──(signed out)──> /sign-in
/sign-in ──sign in──> /onboarding/role | /onboarding/work | /onboarding/business | /work | /business
/onboarding/role ──choose──> /onboarding/work or /onboarding/business
/onboarding/work ──step 1 ⇄ step 2 ──> step 3 ──Profile done──> /work
/onboarding/business ──step 1 ──> step 2 (pin, or Skip for now) ──> step 3 ──Profile done──> /business
/work, /business ──Sign out──> /sign-in
Every screen ──"First Shift" wordmark──> /
```

Dead ends and missing navigation, worst first:

1. **No sign-out anywhere in onboarding.** `SignOutButton` appears only on `/work`, `/business` and the sign-in error state. Someone who signs in with the wrong Google account, or picks the wrong role, is stuck: the wordmark goes to `/`, whose buttons send them straight back to onboarding.
2. **The profile error screen is a dead end.** When `/api/profile` fails, `ProfileGate` shows one red sentence and nothing else: no heading, no Try again, no Sign out (`src/components/ProfileGate.tsx:55`). The only way out is to reload.
3. **The 404 page has no way back.** It's Next's default page, with no wordmark and no link.
4. **Business onboarding has no Back.** After step 1 there's no way to correct the business name, area or hours; the details only show read-only on step 3. Young person step 3 has no Back either.
5. **The home page loses the visitor's intent.** "Find a paid tryout" and "Post a tryout" both end at the same role screen after sign-in, with nothing preselected.
6. **No way to see, edit or delete a profile** once it's finished. SECURITY.md (line 58) promises "Users can delete their account and record". That isn't built.

## B. UI quality

Judged as a senior designer would: the system is disciplined and coherent, but the product is visibly unfinished past onboarding, and the loading, error and desktop states let it down.

### Scores (1 to 5)

| Screen | Hierarchy | Spacing rhythm | Alignment | Consistency | Polish | Reasons |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 5 | 4 | 5 | 4 | 4 | Strong hero, the slip is the right focal point, bands alternate correctly. The slip's time stub wraps "9:00 to 17:00" onto three lines. At 1280 px it's a 448 px phone column in a sea of white |
| `/sign-in` | 4 | 3 | 5 | 4 | 3 | Clear single action, but bare: nothing about what happens after, and no reassurance about the data asked for later. The error state is one red sentence and a Sign out button |
| `/onboarding/role` | 4 | 4 | 5 | 4 | 3 | Two equal secondary buttons is the right call. Neither choice is explained in a line. Its loading skeleton is the wrong shape (a form) |
| `/onboarding/work` | 4 | 3 | 5 | 4 | 3 | Good labels and hints, square checkboxes, and progress done well. A failed submit turns into a wall of bold red text. The ID step's Back sits under Next at full width; it's correct, but the weight is heavy |
| `/onboarding/business` | 4 | 3 | 5 | 4 | 3 | The pin step's copy is excellent ("Location is blocked for First Shift. Tap the icon..."). No Back between steps. The done screen is good, with the pin precision kept above the Stamp |
| `/work`, `/business` | 3 | 3 | 5 | 3 | 1 | Placeholders: a title, a "soon" line and Sign out. Nothing to do. On a laptop this looks broken |
| Loading states | 2 | 2 | 5 | 2 | 2 | Skeletons don't match the screens they stand for (below), so content jumps |
| Error states | 1 | 3 | 5 | 2 | 1 | A bare red sentence with no heading, no action and no way out |
| 404 | 1 | 1 | 3 | 1 | 1 | Next's default page: it looks like a different site |

### Spacing, size and type values actually used in `src/`

Counted across every class string in `src/` (scratchpad script `classes.mjs`).

- **Spacing:** `gap-1` x7, `gap-2` x11, `gap-3` x7, `gap-4` x11, `gap-5` x5, `gap-6` x6, `gap-x-2` x2; `p-4` x3, `px-3` x3, `px-4` x1, `px-5` x3, `py-1` x1, `py-4` x3, `py-8` x1, `pt-5` x1; `mt-1`, `mt-2` x2, `mt-3`, `mt-8`, `mb-1`, `my-2`.
- **Sizes:** `min-h-11` (44 px: secondary buttons, inputs, checkbox rows, the wordmark link), `min-h-13` (52 px: primary button), `h-1` (progress bar), skeleton heights `h-6`, `h-7`, `h-10`, `h-11`, `h-13`, `h-44`, `size-6` (checkbox), `size-32` (photo preview), `w-24` (slip stub), `max-w-md` (the 28 rem column).
- **Type:** `text-4xl` x7 (titles), `text-2xl` x1 (pay), `text-xl` x7 (section headings), `text-lg` x14 (subtitles, body, inputs, checkbox labels), `text-base` x1 (Stamp), `text-sm` x12 (secondary, errors, hints); `font-bold` x28, `font-semibold` x1, `font-medium` x1; `leading-tight` x7, `tracking-title` x7, `tracking-tight` x1; `tabular-nums` x2.

Flags:

1. **DESIGN.md has no spacing scale at all.** It fixes the band padding (20 px) and the column width, and nothing else. Six gap values are in use with no rule for which goes where.
2. **Button stacks are inconsistent:** `gap-2` in `BusinessDetailsStep.tsx:82`, `PhotoStepForm.tsx:76`, `SignInPanel.tsx:78`, `SignOutButton.tsx:33` and `PinStep.tsx:77`, but `gap-3` in `IdStep.tsx:84`, `RoleChoice.tsx:41` and `StartActions.tsx:7`.
3. **Outside the DESIGN.md type table:** `font-semibold` (`ShiftSlip.tsx:19`), `font-medium` (`ShiftSlip.tsx:24`) and `tracking-tight` (`ShiftSlip.tsx:23`). The type table allows only Bold and Regular.
4. Colours are clean: every colour class is a token, there are no hex values in components, and gold is applied only by `ShiftSlip` and `Stamp`.

### Do the home page and the app look like the same product?

Yes, on a phone. The wordmark, the type scale, the 2 px ink edges, the green primary and the paper and mist bands carry through, and onboarding feels like the same hand made it. Two things break the illusion: the home page uses mist bands and the gold slip while every app screen is one plain white band, so the app feels flatter than the pitch; and the app's placeholder homes and default 404 look unfinished next to a polished home page. On a laptop, which is how judges are likely to look first, every screen is a narrow phone column with nothing around it.

### Concrete defects

1. **Mismatched skeletons.** `ProfileGate` always draws a title block and a subtitle block (`ProfileGate.tsx:59-60`), then adds `HomeSkeleton` or `FormSkeleton` (`:62`). `HomeSkeleton` draws its own title and subtitle again, so `/work` and `/business` load as five blocks for a three-element screen (`_work__loading.png`).
2. **The role screen loads with a form skeleton** (`onboarding/layout.tsx:6` applies `skeleton="form"` to `/onboarding/role`), so a field and a large block appear where two buttons will be.
3. **The error state has no structure or action** (`ProfileGate.tsx:55`).
4. **The slip's time stub is too narrow.** At `w-24` (`ShiftSlip.tsx:18`), "9:00 to 17:00" wraps to three lines and looks cramped next to the pay.
5. **The bold red error wall.** Every field error is bold `text-stop`, so a failed step 1 shows four bold red sentences at once (`step1-errors`). The double outline on the focused invalid field (the ink focus ring plus the stop border) is heavy.
6. **Placeholder copy:** "...will show up here soon." (`WorkHome.tsx:17`) and "...from here soon." (`BusinessHome.tsx:17`).
7. **Duplicated markup:** the page title block (`h1 text-4xl` plus a muted `text-lg` paragraph in a `gap-4` stack) is copied into seven files. `SavedDetails.tsx` and `BusinessSaved.tsx` are the same component twice.
8. **No `not-found.tsx` or `error.tsx`** in `src/app`.
9. **Dev only, never in production:** the test sign-in box uses `mt-8` (`TestSignIn.tsx:38`) and an `edge` border, and Next's dev badge overlaps the bottom-left corner.

## C. Code and structure

### File tree, with line counts

Generated with `git ls-files` and `wc -l`; `package-lock.json` is 10,941 lines. Largest source files: `scripts/e2e/browser.ts` 195, `src/domain/messages.ts` 152, `src/domain/profile.ts` 150, `src/domain/profileDecisions.ts` 128. Nothing passes the 250-line cap; `globals.css` (217) isn't linted.

```
src/app (marketing)        page 44, 6 components 12 to 25 each
src/app (account)          layout 7; sign-in 20 + panel 86 + TestSignIn 46; role 20 + 58;
                           onboarding/work 20 + 8 files (9 to 95); onboarding/business 20 + 6 files (9 to 96);
                           work and business: page 16, layout 7, home 22 each
src/app/api                health 12; profile 19; role, worker, business 17 each; photo 21
src/app                    layout 25, globals.css 217
src/components             ProfileGate 68, PhotoStepForm 86, SignOutButton 40, ShiftSlip 37, ProfileDone 29,
                           FormSkeleton 22, HomeSkeleton 14
src/components/ui          Button 39, TextField 37, CheckboxGroup 71, PhotoField 80, FormError 40, Stamp 30,
                           StepProgress 30, AreaField 24, Band 17, PageShell 18
src/config                 rules 66, ai 17, areas 20, performance 19, testSignIn 6, theme 6, contact 2
src/data                   demo 21
src/domain (22 files)      messages 152, profile 150, profileDecisions 128, tryout 84, pay 67, allowedWork 61,
                           saId 61, showUp 58, paymentFlow 51, schedule 49, cancellation 48, ranking 48,
                           strikes 48, time 37, geo 37, fares 32, areas 21, money 14, roles 14, fees 7, hire 6, result 4
src/lib (16 files)         photos 93, usePhotoUpload 88, api 61, useOwnProfile 45, firebaseClient 44,
                           AuthProvider 40, forms 36, location 31, firebaseStorage 24, emulators 23,
                           fetchDestination 19, signInWithGoogle 17, useHeadingFocus 16, firebaseDb 15,
                           gatedProfile 14, useAuth 11
src/schemas                profile 91, tryout 29, ai 22
src/server                 prompts 77, claude 51, env 48, firebaseAdmin 44, ai 32, log 32, errors 23,
                           validate 22, auth 21, idHash 21, rateLimit 21
src/server/repositories    firestoreProfileRepository 81, profileRepository 36, firebasePhotoStore 13, photoStore 7
src/server/services        profileService 112, liveProfileService 10
scripts                    e2e/browser 195, e2e/session 76, evalAi 74, budget 63, e2e/photo 57, e2e/profile 46, seed 34
tests/unit (27 files)      18 to 161 each; support/profileFakes 70
tests/rules                firestore 107, storage 55
tests/fixtures             aiCases 68
```

### Why each root-level file and folder exists

| Item | Why |
| --- | --- |
| `.github/` | `ci.yml`: lint, typecheck, tests, audit, build, budget, then the rules tests in the emulators. `zap-baseline.yml`: a passive ZAP scan of a given URL |
| `.vscode/` | Recommended extensions (ESLint, Tailwind, Vitest, Firebase rules) and workspace settings |
| `docs/` | `RULES.md`, `DESIGN.md`, `PHASES.md`, this audit |
| `public/` | `manifest.webmanifest`; three real icons (a gold slip on green); `.well-known/assetlinks.json`, which is an empty `[]` placeholder for the stretch APK |
| `scripts/` | Tools only: budget, seed, eval, end-to-end checks (below) |
| `src/`, `tests/` | The app and its tests |
| `.env.example` | Every environment variable, with where to get it |
| `.gitattributes` | LF line endings, PNGs binary |
| `.gitignore` | Build output, every `.env*` local file, emulator logs, keystores, service account files, `.claude/` |
| `.npmrc` | `engine-strict=true` (enforces Node 24) and `legacy-peer-deps=true`. The second one hides peer-dependency conflicts and nothing documents why it's there |
| `.nvmrc` | Node 24 |
| `AGENTS.md`, `README.md`, `SECURITY.md` | The standard, setup, and the SSDLC |
| `eslint.config.mjs` | Next's rules, the 250-line cap, no `any`, and the domain and server boundaries |
| `firebase.json` | Emulator ports and the rules files |
| `firestore.rules`, `storage.rules` | Deny by default; the read rules for each collection; the photo upload exception |
| `firestore.indexes.json` | Empty. The nearby feed's geohash queries in Phase 3 will need indexes |
| `netlify.toml` | Build command and Node 24. Never used: the app has never been deployed |
| `next.config.ts` | Security headers and CSP. `script-src` allows `'unsafe-inline'`, which weakens the XSS protection SECURITY.md claims; there's no nonce |
| `package.json`, `package-lock.json` | Exact versions, scripts, and the `@grpc/grpc-js` override |
| `postcss.config.mjs` | Tailwind v4 |
| `tsconfig.json` | Strict TypeScript and the `@/` alias |
| `vitest.config.mts`, `vitest.rules.config.mts` | Unit tests (with `server-only` aliased), and the rules tests |
| Ignored, local only | `.env.development.local` (emulator settings and a dev ID hash secret), `firestore-debug.log`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.claude/` |

### knip (6.41.0 via `npx`, not added to the project)

| Finding | Verdict |
| --- | --- |
| Unused file `src/server/rateLimit.ts` | Built for Phase 2 step 3 and not yet called. AGENTS.md requires rate limits on AI routes and posting, and none are enforced yet because those routes don't exist. It also has a bug: "today" is the UTC date (`rateLimit.ts:5`), so the daily limit resets at 02:00 SAST, not midnight, against AGENTS.md's rule to use `time.ts` |
| Unused file `src/lib/firebaseDb.ts` | Built for the live dashboard list (Phase 2 step 5). Keep |
| Unlisted binary `firebase` | `npm run rules` and `npm run emulators` depend on a globally installed `firebase-tools` that `package.json` doesn't pin. CI pins 15.34.1 through `npx`; a new machine gets whatever is global |
| 11 unused exports | Domain and schema code written ahead for later phases (`reliesOnGrace`, `rankScore`, `ApplySchema`, `OwnerAnswersSchema`, `MarkPaidSchema`, `writeReference`), plus exports only used inside their own file (`storageBucketName`, `CONTACT_PHRASE`) and test helpers (`PROJECT`, `BUCKET`, `NOW`). Building ahead is mild YAGNI, but it will be used if the phases happen |
| 14 unused exported types | Harmless; the types sit next to the functions they describe |

### Duplication, layers and hygiene

- **Layers:** clean. `domain` imports only `config`, itself and `geofire-common`. No `lib`, `components` or `server` file reaches across a boundary. Every route handler follows `requireUser`, then Zod, then the service, then `toErrorResponse`. ESLint enforces only the `domain`/`config` and `server` boundaries, though; nothing stops `components` importing from `app`, or `lib` from `server`.
- **Duplication:** `SavedDetails`/`BusinessSaved`; the page title block (7 copies); the step-form pattern (validate, shake and focus, busy, error) repeated across five step components. That's acceptable but could be one hook.
- **Hygiene:** zero `eslint-disable`, `@ts-ignore`, `any`, non-null assertions, TODOs or `rounded-*`. No em dashes or banned words in product copy; the only em dashes in the repo are in the block `next dev` writes into AGENTS.md.
- **Stale demo data:** `src/data/demo.ts` doesn't match the data model. Its workers have no `role`, `status`, availability, phone or photo; its business is keyed `demo-business-sipho` while real businesses are keyed by the owner's uid, with no pin or photo; its tryout "stages" (`has_applicants`, `awaiting_payment`) aren't tryout statuses. `npm run seed` runs, but the data it writes can't drive any screen. Demo mode (Phase 8) is effectively unstarted.

### `scripts/` and `tests/`

| Item | What it does | Still needed? |
| --- | --- | --- |
| `scripts/budget.ts` | Gzipped JavaScript per page against `performance.ts`; fails if the test sign-in reaches the build | Yes; it's part of `npm run check` and CI |
| `scripts/seed.ts` | Writes demo data to the emulators, or to a demo project with `SEED_DEMO_PROJECT=yes` | Yes, but it must be rewritten for the real model (above) |
| `scripts/evalAi.ts` | The 20-case AI eval against the real API | Yes. **Never run with a real key** |
| `scripts/e2e/session.ts` | Shared set-up for the e2e scripts | Yes |
| `scripts/e2e/profile.ts` | Role and profile through the real routes; proves the ID number leaks nowhere | Yes; it passes |
| `scripts/e2e/photo.ts` | Photo uploads and the photo route against the Storage emulator | Yes; it passes |
| `scripts/e2e/browser.ts` | 32 routing and onboarding checks in Edge at 360 px | Yes; it passes |
| `tests/unit` (27 files, 285 tests) | Every domain rule; profile service with fakes; ID safety through the real routes; schemas, client messages, emulator guards, AI layer with mocks | Yes |
| `tests/rules` (2 files, 15 tests) | Firestore and Storage rules in the emulators | Yes |
| `tests/fixtures/aiCases.ts` | The eval set | Yes |

### AGENTS.md, rule by rule

| Rule | Result | Evidence |
| --- | --- | --- |
| Marketing never loads auth or Firebase | Pass | None of the home page's scripts contain Firebase code; `(marketing)` imports no auth |
| Route handler does four things in order | Pass | All 5 routes |
| Services coordinate, the domain decides; change and audit in one transaction | Pass | `profileService` calls `decide*`; `firestoreProfileRepository` writes `auditLog` in the same transaction |
| `_components` for one screen, one component per file, naming, no barrels | Pass | Scanned |
| `scripts/` never imported by app code | Pass | ESLint rule |
| No file over 250 lines | Pass | Largest 195 |
| Strict TS, no `any`, no non-null assertions | Pass | Scanned |
| Money in cents, formatted with `formatRand` | Pass | |
| Times in UTC, SAST logic through `time.ts` | **Fail** | `rateLimit.ts:5` uses the UTC date for "daily" |
| Every pure function unit-tested | Pass, mostly | 22 domain files covered; `time.ts` only indirectly |
| Performance budgets | Pass, tight | Onboarding pages at 253.2 and 252.8 KB of 260 |
| Accessibility | Partial | Labels, focus, 44 px targets and reduced motion are present; no automated check (axe) and no screen-reader pass; the error state has no heading or landmark |
| Only the eight motions | Pass | Sheet-exit is documented, not built |
| Rules deny by default, tested | Pass | 15 rules tests |
| Photo upload exception as specified | Pass | Photo route, `storage.rules`, `e2e:photo` |
| Audit entry on every profile write | Pass | `e2e:photo` shows `role_set`, `worker_profile_saved`, `photo_saved` |
| Secrets only in env | Pass | Checked before every commit |
| Emulator switch guarded | Pass | Unit tests; `/api/health` reports it |
| Zod at every boundary | Pass | For the routes that exist |
| No silent failures | Pass | AI and route errors are logged and shown |
| POPIA | **Fail on one claim** | The ID handling passes (`idSafety.test.ts`). The "delete their account" promise (`SECURITY.md:58`) isn't built |
| Rate limits on AI routes, applying and posting | Not yet | No such routes; the helper exists but isn't wired, and has the UTC bug |
| Exact versions, lockfile, 14-day rule, audit at 0 | Pass, with a gap | `firebase-tools` is global and unpinned for local scripts; `legacy-peer-deps` is undocumented |
| AI rules (code decides, tagged data, Zod on output, references from answers) | Pass | The classifier prompt's "if any part fits a blocked category, choose it" is close to a safety rule in a prompt; the decision is still code |
| Copy rules | Pass, mostly | "Something went wrong on our side. Try again in a minute." is close to vague, and its screen gives no action |
| No `rounded-*` | Pass | By scan; not lint-enforced |
| One phase at a time; commit per step | Partial | Phase 1 finishing ran inside Phase 2 (on request); the step 7 work sat uncommitted across sessions |
| Definition of done: 360 px and a throttled connection | Partial | 360 px proven in Edge; **no throttled test has ever been run** |
| Ship on the Netlify default subdomain | Not yet | Never deployed |
| Pre-submit checklist | 0 of 8 ticked | Only `check`, `rules` and `budget` pass locally |

## D. Environment

| Service | On this machine | Real service |
| --- | --- | --- |
| Firebase Auth | Emulator (`127.0.0.1:9099`); Google sign-in replaced by the emulator's account picker or the test sign-in | Never used |
| Firestore | Emulator (`:8080`) | Never used; rules never deployed |
| Storage | Emulator (`:9199`) | Never used; no bucket confirmed |
| Claude | No key anywhere, so every AI call fails closed | Never called successfully; the eval has never run |
| Netlify | Nothing | Never deployed; no git remote is configured |

`/api/health` right now (dev server, emulators running):

```json
{"status":"ok","configured":{"firebaseAdmin":false,"anthropic":false,"idHashing":true,"photoStorage":true},"emulators":true}
```

What's missing for real Google sign-in on this machine:

1. A real Firebase project with the Google provider enabled. `localhost` is an authorised domain by default.
2. Its web settings (`NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`) and Admin credentials (`FIREBASE_ADMIN_PROJECT_ID`, `_CLIENT_EMAIL`, `_PRIVATE_KEY`) in `.env.local`. Without the Admin credentials the server can't verify a real token, so every route returns 401 or 503.
3. **Remove the emulator settings from `.env.development.local`.** Next.js loads `.env.development.local` before `.env.local` under `next dev`, so as long as it sets `NEXT_PUBLIC_USE_EMULATORS=true` and the emulator hosts, real settings in `.env.local` are ignored. The README (line 92) tells people to put emulator settings in `.env.local`, which doesn't match how this machine is actually set up.
4. A Storage bucket (new projects may need the Blaze plan for Cloud Storage), and the rules deployed with `firebase deploy --only firestore:rules,storage`.
5. `ID_HASH_SECRET` is already set for development; production needs its own.

## E. What's left

| Phase | State | What remains |
| --- | --- | --- |
| 0 Skeleton | Done | |
| 1 Sign-in and profiles | Done with the emulators (tag `phase-1`) | Real Google sign-in, real Storage and a real phone have never been tried |
| 2 Posting | Partial: 2 of 5 steps | Server routes, posting screen and dashboard (steps 3 to 5); React Aria not installed; the eval never run |
| 3 Finding | Not started | Nearby feed with geohash queries (and indexes), fares, tryout detail, applying with limits, push alerts. Only the pure `fares.ts` exists |
| 4 Booking | Not started | Shortlist, booking, check-in code, WhatsApp chat, trip share. `ranking.ts` and `showUp.ts` exist |
| 5 The day and paying | Not started | Door check, check-in and check-out, Paid and Received. `pay.ts` and `paymentFlow.ts` exist |
| 6 Records | Not started | Three answers, AI reference, ratings, shareable record, hire prompt, fees. `fees.ts`, `hire.ts` and `writeReference` exist |
| 7 Fair play | Not started | Cancellations, strikes, pauses, review list. `cancellation.ts` and `strikes.ts` exist |
| 8 Demo and polish | Not started | Demo mode (the demo data is stale), offline screen, accessibility pass, Contact and Privacy pages |
| 9 Launch | Partial | Rules tests and the ZAP workflow exist; no deploy, no pen-test pass, no real-key eval |

Non-code deadlines in `PHASES.md`: the SSDLC (Saturday 12:00) and the 20-second video (Saturday 13:30) have passed; I can't tell from the repo whether they were submitted. The Lean Business Canvas is due today at 12:00.

**Estimate.** Measured pace: Phase 1 steps 5 to 7 plus Phase 2 steps 1 and 2 took most of Saturday with heavy review. The remaining work, done to the current standard:

| Work | Hours |
| --- | --- |
| Phase 2 steps 3 to 5 | 6 to 8 |
| Phase 3 (push alone is about 3) | 8 to 10 |
| Phase 4 | 6 to 8 |
| Phase 5 | 6 to 8 |
| Phase 6 | 5 to 7 |
| Phase 7 | 5 to 7 |
| Phase 8 | 6 to 8 |
| Phase 9 plus a first real deploy | 4 to 6 |
| **Total** | **46 to 62 focused hours** |

About 48 hours of clock time remain, including sleep, the Lean Canvas and submission. Realistically that's 26 to 32 productive hours. **The full plan won't be finished by Monday 23:59.** A demoable end-to-end loop with demo mode can be, if scope is cut now.

Biggest risks:

1. **No real deployment yet.** Real Firebase, Netlify with Next 16, the CSP against real Google services, and the Storage plan are all untested. Lesson 3 in AGENTS.md says these cost hours; doing them on Monday is the worst case.
2. **Scope.** Seven phases in about 30 hours is not possible at this standard.
3. **No judge path.** Without seeded demo data and demo mode, a judge sees sign-in and two forms that end on "soon".
4. **The AI claim is unproven.** "AI blocks unsafe work" has never been measured against the real model.
5. **Push notifications** (VAPID, service worker, FCM) are the single largest time sink in Phase 3, for little demo value.
6. **Thin desktop presentation** if judges view on laptops.

## F. Recommendations (not acted on)

### Cleanup

1. Fix the environment story: document `.env.development.local` as the emulator file, and make README match it (README line 92).
2. Pin `firebase-tools` as a devDependency at 15.34.1, or document the global version in README.
3. Correct SECURITY.md: qualify the account-deletion promise until it's built; record the `'unsafe-inline'` script policy as an accepted risk, or move to a nonce.
4. Fix `rateLimit.ts` to count days in SAST through `time.ts` before wiring it in.
5. Merge `SavedDetails` and `BusinessSaved`; extract a `PageTitle` component.
6. Document `legacy-peer-deps` or remove it.
7. Rewrite `src/data/demo.ts` and `seed.ts` against the real model, as part of demo mode.

### UI

1. Make skeletons match: a role-screen skeleton, and drop the duplicate title blocks between `ProfileGate` and `HomeSkeleton`.
2. Give the gate's error state a heading, a Try again button and Sign out.
3. Put Sign out in reach during onboarding (for example in the header).
4. Add a branded `not-found.tsx` and `error.tsx` with a way home.
5. Widen the slip stub so the time fits on two lines.
6. Add a spacing scale to DESIGN.md and use one gap for button stacks. Remove the three off-scale type classes from `ShiftSlip`.
7. Carry intent from the home page's two buttons through sign-in to the role screen.
8. Add Back to business onboarding and to young person step 3.
9. Decide on desktop: a deliberate phone frame, or wider bands on large screens.

### Functionality: a scope-cut path to a working loop by Monday

1. **Today, first:** create the real Firebase project, deploy the current app to Netlify, and prove real Google sign-in on a phone. This de-risks everything else.
2. Run `npm run eval:ai` with a real key; fix any failures.
3. Phase 2 steps 3 to 5, as planned.
4. Phase 3 without push alerts: a nearby list (geohash), detail, apply.
5. Phase 4 core: shortlist, book, check-in code. WhatsApp and trip share as plain `wa.me` links only.
6. Phase 5 core: check in, check out, Paid, Received.
7. Phase 6 core: the three answers and the AI reference on the record. Drop blind ratings and the hire prompt.
8. Demo mode with seeded accounts at every stage, so one judge can walk the loop alone. This matters more for judging than any remaining rule.
9. Phase 7: keep the rules as tested domain functions (already done) and show them in demo copy. Skip the review list UI.
10. Phase 9: deploy, ZAP baseline, the pre-submit checklist.

Drop entirely: push alerts, the fill forecast, the APK, Contact and Privacy as separate designs (make them two plain text pages).
