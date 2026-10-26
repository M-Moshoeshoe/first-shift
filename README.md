# First Shift

Paid one-day tryouts at businesses near you, with a reference from the business that paid. Built for the FNB App of the Year Hackathon 2026.

## What's in this skeleton

- Next.js 16 (App Router), strict TypeScript and Tailwind, ready for Netlify
- Every product rule as a pure, unit-tested function in `src/domain`
- Firestore and Storage security rules that deny by default, with emulator tests
- Server-only adapters for Firebase Admin, auth, the Claude API, rate limits and logging
- Checks on every deploy: Netlify runs `npm run verify` (lint, typecheck, tests, build, budgets, dependency audit) and refuses to deploy a failure. GitHub Actions workflows for the same checks, the rules tests and a ZAP scan are in `.github/workflows`, paused for now (Troubleshooting)
- `AGENTS.md`, the engineering standard Claude Code follows, plus `SECURITY.md`, `docs/RULES.md`, `docs/DESIGN.md` and `docs/PHASES.md`

## 1. Install the tools (once)

1. **Node.js 24 LTS** from nodejs.org. Check with `node -v`; it must show v24.12 or later.
2. **Git** from git-scm.com. Accept the defaults; this also installs Git Bash.
3. **VS Code** from code.visualstudio.com.
4. **Java 21** (Eclipse Temurin, from adoptium.net). Only needed for the Firebase emulators.
5. **Firebase CLI:** nothing to install. The project pins `firebase-tools` 15.34.1 as a dev dependency, and the npm scripts use that copy. Run it yourself as `npx firebase`, never a global install, so everyone uses the same version.

Use **Git Bash** as your VS Code terminal (Terminal > New Terminal > the dropdown > Git Bash). Commands below are written for it. In PowerShell, use `curl.exe` instead of `curl`.

## 2. Open the project

1. Unzip `first-shift.zip` somewhere without spaces in the path, for example `C:\dev\first-shift`.
2. In VS Code: File > Open Folder > `first-shift`. Accept the recommended extensions when asked.
3. In the terminal:

```bash
npm ci
npm run check
```

`npm run check` runs lint, typecheck, the unit tests and a production build. It should pass before you change anything.

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
6. **Project settings** > Cloud Messaging > Web Push certificates > Generate key pair. Copy the key.
7. **Project settings** > Service accounts > Generate new private key. Keep the downloaded file private and never commit it.

Then create your local environment file:

```bash
cp .env.example .env.local
```

Fill in `.env.local`: the web config values, the VAPID key, and from the service account file the `project_id`, `client_email` and `private_key` (paste the key with its `\n` escapes intact). Add your Anthropic API key, and generate the ID hashing secret with:

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
| `npm run review:tryout` | Lists tryouts waiting for review; `-- <id> approve <category> --reviewer <name>` or `-- <id> reject --reviewer <name>` decides one, audit-logged |
| `npm run e2e:profile` | Role and young person profile through the real client code, against the emulators (settings in section 5) |
| `npm run e2e:photo` | Photo uploads and the photo route against the Storage emulator |
| `npm run e2e:browser` | The whole walk in Microsoft Edge at 360 and 1280 px, axe on every screen: both onboarding journeys, posting, the nearby feed, a tryout, applying and withdrawing, and the dashboard's applicant count, plus Slow 4G timings, signed in with the test-only emulator sign-in (needs `npm run emulators` and `npm run dev`) |
