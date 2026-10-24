# First Shift

Paid one-day tryouts at businesses near you, with a reference from the business that paid. Built for the FNB App of the Year Hackathon 2026.

## What's in this skeleton

- Next.js 16 (App Router), strict TypeScript and Tailwind, ready for Netlify
- Every product rule as a pure, unit-tested function in `src/domain` (51 tests)
- Firestore and Storage security rules that deny by default, with emulator tests
- Server-only adapters for Firebase Admin, auth, the Claude API, rate limits and logging
- CI (lint, typecheck, tests, dependency audit, build, rules tests) and a ZAP security scan
- `AGENTS.md`, the engineering standard Claude Code follows, plus `SECURITY.md`, `docs/RULES.md`, `docs/DESIGN.md` and `docs/PHASES.md`

## 1. Install the tools (once)

1. **Node.js 24 LTS** from nodejs.org. Check with `node -v`; it must show v24.12 or later.
2. **Git** from git-scm.com. Accept the defaults; this also installs Git Bash.
3. **VS Code** from code.visualstudio.com.
4. **Java 21** (Eclipse Temurin, from adoptium.net). Only needed for the Firebase emulators.
5. **Firebase CLI:** in a terminal, run `npm install -g firebase-tools`, then `firebase login`.

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
firebase use --add
firebase deploy --only firestore:rules,storage
```

## 5. Emulators, security rules tests and demo data

Run the security rules tests (starts the emulators, runs the tests, stops them):

```bash
npm run rules
```

For local development against the emulators, run `npm run emulators` in one terminal. In a second terminal, load the demo data:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
```

The seed script refuses to run against a live project unless `SEED_DEMO_PROJECT=yes` is set, so demo data can't leak into real feeds.

To run the app itself against the emulators, with no real Firebase project needed, put these in `.env.local` and restart `npm run dev`:

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

The emulators only work with `npm run dev`. A production build (`npm run build` then `npm start`) sends a security policy that blocks connections to local addresses such as `127.0.0.1`, by design, so it can't reach them.

"Continue with Google" then opens the emulator's own account picker instead of Google's. The switch only works on `localhost` or `127.0.0.1`, and `/api/health` shows `"emulators": true` while any of these are set. Never set them on Netlify.

## 6. Put it on GitHub

```bash
git init
git add .
git commit -m "Add First Shift skeleton"
```

Create a public repository on GitHub called `first-shift`, then follow GitHub's instructions to push. A public repo gives judges the Git link Sonke asks for and enables free code scanning. Never commit `.env.local`; `.gitignore` already excludes it.

## 7. Deploy to Netlify

1. At app.netlify.com: Add new site > Import an existing project > GitHub > `first-shift`. `netlify.toml` already sets the build.
2. Site configuration > Environment variables: add every variable from `.env.local`.
3. Deploy. Open `https://<your-site>.netlify.app/api/health` and confirm everything is true.
4. In Firebase **Authentication** > Settings > Authorized domains, add your `netlify.app` domain so Google sign-in works there.

Every push to `main` redeploys. Pull requests get their own preview URL.

## 8. Build with Claude Code

Open a terminal in the project folder and run `claude`. It reads `AGENTS.md` automatically. Work through `docs/PHASES.md` one phase at a time, and run `npm run check` after every phase before you commit.

## Troubleshooting

- **`npm ci` says your Node version isn't supported:** install Node.js 24 LTS (v24.12 or later) and reopen VS Code.
- **`npm ci` fails with a peer dependency error:** make sure the `.npmrc` file is in the project folder. It tells npm not to auto-resolve optional peer packages, which works around a known npm bug; every package we need is listed in `package.json`.
- **Typecheck fails after moving a route** (for example "Cannot find module '../../src/app/page.js'" in `.next/types`): Next.js generated route types for the old paths. Delete the `.next` folder and run the build again.
- **Google sign-in fails on the live site:** add your `netlify.app` domain under Firebase Authentication > Settings > Authorized domains.
- **`/api/health` shows false for something:** that environment variable is missing or misnamed in `.env.local` or in Netlify.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run check` | Lint, typecheck, unit tests, build and JavaScript budget: run before every push |
| `npm run budget` | Each page's JavaScript, gzipped, against `src/config/performance.ts` (needs a build first) |
| `npm test` | Unit tests only |
| `npm run rules` | Security rules tests in the emulators |
| `npm run emulators` | Firebase emulators with the UI at http://localhost:4000 |
| `npm run seed` | Load demo data (emulator or a dedicated demo project only) |
