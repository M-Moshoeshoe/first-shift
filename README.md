# First Shift

**Every job wants experience. This is where you get it.**

First Shift connects young South Africans with paid one-day tryouts at small businesses near them. A business posts a tryout in one sentence. A young person nearby applies, works the day, is paid directly by the business (FNB eWallet, PayShap, a cash-send or cash), and gets a reference written from the owner's answers. Every tryout adds a verified line to the young person's work record, which they can share with any employer.

Built for the **FNB App of the Year Hackathon 2026**, Youth employment and work readiness track.

**Live:** https://firstshiftza.netlify.app

## Try it in one tap

1. Open https://firstshiftza.netlify.app/sign-in (or tap **Try the demo** at the top of the home page).
2. Tap **Try as Thabo, looking for work** or **Try as Sipho, a business**. No password to type.
3. To see both sides, use two browsers (or one normal window and one private window), one for each.

The demo starts mid-story: Sipho and Thabo have already done two tryouts together, so Thabo's record has entries and a reference. To walk a whole tryout: as Sipho, open "Phone shop helper" and offer it to Thabo; as Thabo, accept it under Applications; on the booking, tap **Skip to the day** (demo only: it moves the start to now); as Sipho, check Thabo in with the code on Thabo's screen, check out, and mark it paid; as Thabo, tap Received, write the reference and add it to the record. Their third tryout together brings up "Offer Thabo a job". **Reset the demo**, at the top of every demo screen, puts everything back to the start.

The demo accounts and everything in them are made up and marked demo. Demo and real data never meet: a demo account sees only demo tryouts and people, and a real account never sees demo ones (`SECURITY.md`, Demo isolation).

## The loop

| Step | Who | What happens |
| --- | --- | --- |
| Post | Business | Describe the work in a sentence. Claude drafts the title and tasks; code checks the pay is at least the minimum wage (R30.23 an hour), the time is in daylight, and the work is allowed. Unsafe work (electrical, driving, heights, chemicals) is refused with a safer idea; a tryout that asks the young person for money is refused before the AI sees it |
| Find and apply | Young person | Tryouts within reach, with the pay, the return taxi fare from published routes and what's left after it, whether injury cover is confirmed, and how the business pays on time |
| Shortlist and offer | Business | Applicants ranked by skill fit, how likely they are to show up (with the reasons) and distance, always with a place kept for someone with no record yet. One offer at a time |
| Booked | Both | The exact pin, names and photos, a 6-digit check-in code, WhatsApp, Share my trip (a link a trusted person can follow), Report a problem, and fair cancellation rules |
| The day | Both | The owner checks the face and ID card at the door and types the young person's code; at check-out, the app works out what's owed (never below 4 hours) and the owner answers three questions |
| Pay | Business | Pays directly by one of the ways the young person chose, then marks it paid. First Shift never holds or moves wages |
| Received | Young person | Checks their real balance, then taps Received (or Not received, which opens a dispute with proof and pauses the business) |
| Reference and record | Young person | A reference written with AI from the owner's three answers only. They add it to their record or challenge it. The record and its share link show only verified, paid tryouts |
| Job offer | Business | After three tryouts together, or before the 24-hour line that would make it regular employment, the owner is asked to offer a job instead |

## What it costs

Free for young people. Businesses pay R25 for each completed tryout, with the first 3 free. A credit is used only when the young person is owed money, and returned when nothing is owed (`docs/MONEY.md`).

## Built with

- **Next.js 16** (App Router), **React 19**, strict **TypeScript**, **Tailwind CSS 4**, on **Netlify**
- **Firebase**: Google sign-in, Firestore and Storage, with every write going through server routes using the Admin SDK
- **Claude** (`claude-haiku-5-5`) drafts tryouts, sorts work into allowed kinds and writes references. Code decides: the pay floor, the allowed list, the notice rules and every status change live in `src/domain`, never in a prompt
- Every product rule is a pure, unit-tested function in `src/domain` (`docs/RULES.md`)

## Security, in one paragraph

Firestore and Storage rules deny by default and are tested for every role. ID numbers are kept only as a keyed hash and the last four digits; no face matching; no personal data in logs or AI prompts. Every write is validated with Zod and audit-logged in the same transaction. Every Netlify deploy runs lint, typecheck, the unit tests, the build, per-page JavaScript budgets and `npm audit`, and refuses to deploy a failure. The full SSDLC is in `SECURITY.md`.

## The panel's feedback

The Geekulcha panel asked us to show the whole loop, make references fair and challengeable, and be clear about non-payment, cancellations, injuries, harassment, disputes, identity checks and labour law. Each point, our answer and where it lives is in `docs/FEEDBACK.md`; our reading of the law, with sources, is in `docs/COMPLIANCE.md`.

## Documents

| File | What's in it |
| --- | --- |
| `docs/RULES.md` | Every product rule in plain language |
| `docs/MONEY.md` | How money and credits move, and the unit economics |
| `docs/COMPLIANCE.md` | Labour, tax and worker-protection law, with sources |
| `docs/FEEDBACK.md` | The panel's feedback and our answers |
| `docs/DESIGN.md` | Design tokens, type, motion and performance budgets |
| `docs/PHASES.md` | The build plan and the pilot |
| `docs/AUDIT-2.md` | The audit on submission day and the fixes that followed |
| `SECURITY.md` | The SSDLC: threats, controls and how each is tested |
| `AGENTS.md` | The engineering standard the code follows |

# For developers

## 1. Install the tools (once)

1. **Node.js 24 LTS** from nodejs.org. Check with `node -v`; it must show v24.12 or later.
2. **Git** from git-scm.com. Accept the defaults; this also installs Git Bash.
3. **VS Code** from code.visualstudio.com.
4. **Java 21** (Eclipse Temurin, from adoptium.net). Only needed for the Firebase emulators.
5. **Firebase CLI:** nothing to install. The project pins `firebase-tools` 15.34.1 as a dev dependency, and the npm scripts use that copy. Run it yourself as `npx firebase`, never a global install, so everyone uses the same version.

Use **Git Bash** as your VS Code terminal (Terminal > New Terminal > the dropdown > Git Bash). Commands below are written for it. In PowerShell, use `curl.exe` instead of `curl`.

## 2. Open the project

1. Clone the repository somewhere without spaces in the path: `git clone https://github.com/M-Moshoeshoe/first-shift.git C:/dev/first-shift`.
2. In VS Code: File > Open Folder > `first-shift`. Accept the recommended extensions when asked.
3. In the terminal:

```bash
npm ci
npm run check
```

`npm run check` runs lint, typecheck, the unit tests, a production build and the JavaScript budgets. It should pass before you change anything.

## 3. Run it locally

```bash
npm run dev
```

Open http://localhost:3000. Then open http://localhost:3000/api/health: it shows which integrations are configured, as true or false, without revealing any value.

## 4. Connect Firebase

1. At console.firebase.google.com, create a project called `first-shift`.
2. **Authentication** > Get started > enable **Google**.
3. **Firestore Database** > Create database > production mode. Pick the region closest to South Africa (for example `africa-south1`, Johannesburg, if it's offered).
4. **Storage** > Get started.
5. **Project settings** > Your apps > add a **Web app**. Copy its config values.
6. **Project settings** > Service accounts > Generate new private key. Keep the downloaded file private and never commit it.

Then create your local environment file:

```bash
cp .env.example .env.local
```

Fill in `.env.local`: the web config values, and from the service account file the `project_id`, `client_email` and `private_key` (paste the key with its `\n` escapes intact). Add your Anthropic API key, and generate the ID hashing secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Restart `npm run dev` and check `/api/health` again; every value should now be true.

Deploy the security rules to your project:

```bash
npx firebase login
npx firebase use --add
npx firebase deploy --only firestore:rules,storage
```

## 5. Emulators and security rules tests

Run the security rules tests (starts the emulators, runs the tests, stops them):

```bash
npm run rules
```

For local development against the emulators, run `npm run emulators` in one terminal and `npm run dev` in another.

To run the app against the emulators, with no real Firebase project needed, put these in **`.env.development.local`** (not `.env.local`) and restart `npm run dev`:

```bash
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-first-shift
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-first-shift.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-first-shift.appspot.com
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

Why that file: `npm run dev` reads `.env.development.local` first and `.env.local` second, and the first value found wins. Keeping the emulator settings in `.env.development.local` means they apply to `npm run dev` only, never to a production build. It also means **real settings in `.env.local` are ignored while these lines are there**. To switch to real services, delete or comment out every line above in `.env.development.local`, then restart `npm run dev`.

The emulators only work with `npm run dev`. A production build (`npm run build` then `npm start`) sends a security policy that blocks connections to local addresses such as `127.0.0.1`, by design, so it can't reach them.

"Continue with Google" then opens the emulator's own account picker instead of Google's. The switch only works on `localhost` or `127.0.0.1`, and `/api/health` shows `"emulators": true` while any of these are set. Never set them on Netlify.

## 6. GitHub, real services and Netlify

`docs/DEPLOY.md` is the click-by-click guide: the GitHub repository, the Firebase project (Google sign-in, Firestore, Storage, the billing alert, the rules), real settings on your laptop, Netlify and its environment variables, the Anthropic key, and the final checks. Never commit `.env.local` or the service account file; `.gitignore` already excludes them.

## 7. Branches and deploys

Work on the `dev` branch: Netlify doesn't build it, so it costs no credits. When a change should go live, run `npm run verify` and `npm run rules` locally, then merge `dev` into `main` and push. Netlify builds `main`, running `npm run verify` first; a failing check stops the deploy and the live site stays as it was.

## 8. Build with Claude Code

Open a terminal in the project folder and run `claude`. It reads `AGENTS.md` automatically. Work through `docs/PHASES.md` one item at a time, and run `npm run verify` after every item before you commit.

## Troubleshooting

- **`npm ci` says your Node version isn't supported:** install Node.js 24 LTS (v24.12 or later) and reopen VS Code.
- **Why `.npmrc` has `legacy-peer-deps=true`:** it was added in Phase 0 to work around an npm resolver bug with optional peer dependencies, where npm tried to install or reconcile optional peers no package here uses and failed with a peer dependency error. Every package we need is listed in `package.json` with an exact version, so npm doesn't need to resolve peers for us. On 25 October 2026 a fresh resolve of `package.json` without the flag succeeded with no peer errors, so the flag may no longer be needed; it stays until someone removes it and `npm ci`, `npm run check` and `npm run rules` still pass. The cost of keeping it: npm no longer warns about peer mismatches, so check a new package's peer requirements by hand before adding it.
- **Typecheck fails after moving a route** (for example "Cannot find module '../../src/app/page.js'" in `.next/types`): Next.js generated route types for the old paths. Delete the `.next` folder and run the build again.
- **GitHub shows a red X on every push, "The job was not started because your account is locked due to a billing issue":** GitHub Actions is paused on the account. Nothing failed: no job ran. The same checks run in every Netlify build (`npm run verify`) and the rules tests run locally (`npm run rules`). The workflows resume by themselves once the account's billing is sorted out.
- **Real Firebase settings in `.env.local` seem to be ignored, or sign-in still opens the emulator's account picker:** `.env.development.local` still holds the emulator settings, and `npm run dev` reads it before `.env.local`, so its values win (Next.js loads `process.env`, then `.env.development.local`, then `.env.local`, then `.env.development`, then `.env`). Delete or comment out the emulator lines in `.env.development.local` and restart `npm run dev`. `/api/health` shows `"emulators": false` once they're gone.
- **Google sign-in fails on the live site:** add your `netlify.app` domain under Firebase Authentication > Settings > Authorized domains.
- **`/api/health` shows false for something:** that environment variable is missing or misnamed in `.env.local` or in Netlify.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run check` | Lint, typecheck, unit tests, build and JavaScript budget |
| `npm run verify` | `check` plus `npm audit`: Netlify's build command, and what to run before every push |
| `npm run budget` | Each page's JavaScript, gzipped, against `src/config/performance.ts` (needs a build first) |
| `npm test` | Unit tests only |
| `npm run rules` | Security rules tests in the emulators |
| `npm run emulators` | Firebase emulators (pinned `firebase-tools`) with the UI at http://localhost:4000 |
| `npm run demo:accounts` | Sets up the two demo accounts for judges from `.env.demo.local` or flags, and switches off Firebase's own password sign-in (`docs/DEPLOY.md`, 5b) |
| `npm run demo:reset` | Puts the demo accounts' data back to a known state; touches only demo records |
| `npx firebase deploy --only firestore:indexes` | Deploys the Firestore indexes in `firestore.indexes.json` (the nearby feed needs one) |
| `npm run e2e:demo` | Attacks a demo account in the emulators the way anyone with its password could, and checks each attack is refused |
| `npm run credits:backfill` | Shows which complete businesses lack their free credits; `-- --apply` grants them (says first whether it targets the emulators or the live project) |
| `npm run credits:grant` | Lists businesses waiting for credits; `-- <businessUid> <amount> --reason "<why>" --admin <name>` adds them (1 to 50), audit-logged, and closes the request |
| `npm run review:case` | Lists open review cases by priority; `-- <caseId>` shows the full context; `-- <caseId> resolve --outcome "..." --reason "..." --admin <name>` with any of `--pause`, `--unpause`, `--strike`, `--overturn`, `--reference`, `--grant` resolves it, audit-logged |
| `npm run pilot:metrics` | The pilot's numbers per week and in total, from real records only (read-only) |
| `npm run review:tryout` | Lists tryouts waiting for review; `-- <id> approve <category> --reviewer <name>` or `-- <id> reject --reviewer <name>` decides one, audit-logged |
| `npm run e2e:profile` | Role and young person profile through the real client code, against the emulators (settings in section 5) |
| `npm run e2e:photo` | Photo uploads and the photo route against the Storage emulator |
| `npm run e2e:browser` | The whole walk in Microsoft Edge at 360 and 1280 px, axe on every screen: both onboarding journeys, posting, the nearby feed, a tryout, applying and withdrawing, and the dashboard's applicant count, plus Slow 4G timings, signed in with the test-only emulator sign-in (needs `npm run emulators` and `npm run dev`) |
