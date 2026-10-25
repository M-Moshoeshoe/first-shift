# Going live: GitHub, Firebase, Netlify and Claude

A click-by-click guide from this laptop to a live site at `https://<name>.netlify.app`, with real Google sign-in. Do the parts in order; each one needs the one before. Allow about 90 minutes. Consoles change their labels from time to time: where a label here doesn't match, look for the nearest equivalent and note it so this guide can be fixed.

Use **Git Bash** for the commands (in PowerShell, use `curl.exe` instead of `curl`).

**Never paste a key, secret or the service account file into a chat, an issue, a commit or a screenshot.**

## 1. GitHub (10 minutes)

1. Sign in at https://github.com and click **+** (top right) > **New repository**.
2. **Repository name:** `first-shift`. **Public** (the judges need the link, and code scanning is free on public repositories).
3. Leave **Add a README**, **.gitignore** and **license** all off: the project has its own.
4. Click **Create repository**. Copy the HTTPS address it shows, `https://github.com/<your-username>/first-shift.git`.
5. In the project folder:

   ```bash
   git status                     # must say "nothing to commit, working tree clean", or only files you expect
   git remote add origin https://github.com/<your-username>/first-shift.git
   git push -u origin main
   git push origin phase-1
   ```

   Git opens a browser window to sign in to GitHub the first time.
6. GitHub Actions is paused on this account for a billing issue (README, Troubleshooting), so a push shows a red X with "The job was not started". Nothing failed. The checks run in every Netlify build instead (`npm run verify`), and the rules tests locally (`npm run rules`).

## 2. Firebase project (25 minutes)

### 2.1 Create the project

1. Go to https://console.firebase.google.com and click **Create a project** (or **Add project**).
2. **Name:** `first-shift`. Firebase shows the project ID under the name, for example `first-shift-1a2b3`. **Write it down**: it's used below.
3. **Google Analytics:** turn it off. We don't use it.
4. Click **Create project**, wait, then **Continue**.

### 2.2 Google sign-in

1. Left menu: **Build** > **Authentication** > **Get started**.
2. **Sign-in method** tab > **Google** > switch **Enable** on.
3. **Project support email:** choose your address. Click **Save**.
4. **Settings** tab > **Authorized domains**: `localhost` is already there. You add the Netlify address in part 5.

### 2.3 Firestore

1. Left menu: **Build** > **Firestore Database** > **Create database**.
2. If asked for an edition, choose **Standard**.
3. **Database ID:** leave `(default)`.
4. **Location:** choose **africa-south1 (Johannesburg)** if it's in the list. If it isn't, choose **europe-west1**, the closest that's usually offered. The location can never be changed later.
5. **Secure rules:** choose **Start in production mode** (everything denied). Our real rules replace these in 2.6.
6. Click **Create**.

### 2.4 Billing plan and a $1 budget alert

Cloud Storage for Firebase needs the pay-as-you-go **Blaze** plan to create a bucket in new projects. At our size (a few hundred small photos and a few thousand reads in the demo) the bill should be zero or a few cents, but we set an alert so it can't surprise you.

1. In the Firebase console, bottom of the left menu: **Upgrade** (or the plan name, **Spark**) > **Select plan** under **Blaze**.
2. Link a Cloud Billing account: choose an existing one, or **Create a Cloud Billing account** and enter a card. Google may run a small temporary authorisation on the card.
3. When it offers a budget, set **$1**. If it doesn't, do it now:
   1. Open https://console.cloud.google.com/billing, choose the billing account linked to `first-shift`.
   2. **Budgets & alerts** > **Create budget**.
   3. **Name:** `first-shift`. **Projects:** your `first-shift` project only. **Next**.
   4. **Budget type:** Specified amount. **Target amount:** `1` (in your billing currency). **Next**.
   5. **Alert thresholds:** 50%, 90% and 100% of actual spend. Tick **Email alerts to billing admins and users**. **Finish**.

   A budget sends emails; it does not stop spending by itself. With $1 alerts you'll know within a day if anything runs away, and you can then downgrade or disable billing for the project.

### 2.5 Storage

1. Left menu: **Build** > **Storage** > **Get started**.
2. **Location:** choose **africa-south1** if offered, to match Firestore. This keeps people's photos in South Africa, which keeps POPIA's cross-border rules out of it. (US locations such as `us-central1` have a free storage allowance; outside them you pay from the first byte, which at our size is cents.)
3. **Rules:** **Start in production mode**. Our real rules replace these in 2.6.
4. Click **Create** (or **Done**). The bucket name appears at the top, usually `<project-id>.firebasestorage.app`. **Write it down.**

### 2.6 Deploy our security rules, with the project's pinned Firebase CLI

```bash
npx firebase login                 # a browser window opens; sign in with the same Google account
npx firebase use --add             # choose your first-shift project; for the alias, type: default
npx firebase deploy --only firestore:rules,storage
```

It should finish with **Deploy complete!** and list `firestore` and `storage`. `firebase use --add` creates a small `.firebaserc` file holding only the project ID, which isn't secret. Commit it so the deploy command works on any machine:

```bash
git add .firebaserc && git commit -m "Point the Firebase CLI at the live project" && git push
```

### 2.7 The web app settings

1. Gear icon (top left) > **Project settings** > **General** tab.
2. Under **Your apps**, click the web icon **</>**.
3. **App nickname:** `first-shift-web`. Leave **Firebase Hosting** unticked (we host on Netlify). **Register app**.
4. It shows a `firebaseConfig` block. Keep this tab open: you need `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` and `appId`. These are public by design; the security rules protect the data.
5. Click **Continue to console**.

### 2.8 The server's key (service account)

1. **Project settings** > **Service accounts** tab > **Firebase Admin SDK** > **Generate new private key** > **Generate key**.
2. A `.json` file downloads. **Move it out of Downloads into a private folder outside the project**, for example `C:\Users\HP\secrets\`. Never put it in the project folder.
3. You need three values from it: `project_id`, `client_email` and `private_key`.

## 3. Real services on this laptop (15 minutes)

### 3.1 Switch off the emulators

`npm run dev` reads `.env.development.local` before `.env.local`, and the first value found wins (README, Troubleshooting). That file currently holds the emulator settings and a development ID secret, so it must go out of the way. Renaming it keeps it for later:

```bash
mv .env.development.local .env.emulators.local
```

Next.js doesn't read a file with that name, and `.gitignore` already covers it. To go back to the emulators later, rename it back.

### 3.2 Create `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` from 2.7 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` (must match the bucket from 2.5) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Leave empty: push alerts are cut |
| `FIREBASE_ADMIN_PROJECT_ID` | `project_id` from the JSON file |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `client_email` from the JSON file |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `private_key` from the JSON file, on one line, in double quotes, keeping its `\n` escapes exactly as they appear: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"` |
| `ANTHROPIC_API_KEY` | From part 6; leave empty for now |
| `ID_HASH_SECRET` | A new secret, generated with the command below |
| `AI_DAILY_REQUESTS_PER_USER` | `30` |
| `NEXT_PUBLIC_USE_EMULATORS` | **Leave empty** |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**`ID_HASH_SECRET` must be the same here and on Netlify, and must never change once real people have signed up.** Every ID number is stored only as a hash made with it. A different secret on the laptop and the live site would let the same ID open two accounts; changing it later would do the same for everyone already signed up. Keep a copy in your password manager.

Leave the three `*_EMULATOR_HOST` lines commented out.

### 3.3 Try it

```bash
npm run dev
```

1. Open http://localhost:3000/api/health. Expect:

   ```json
   {"status":"ok","configured":{"firebaseAdmin":true,"anthropic":false,"idHashing":true,"photoStorage":true},"emulators":false}
   ```

   (`anthropic` turns true in part 6.) Anything else false: that variable is missing or misspelt in `.env.local`. Restart `npm run dev` after every change to `.env.local`.
2. Open http://localhost:3000/sign-in. The test sign-in box must be **gone**. Tap **Continue with Google**: Google's real account chooser opens. Sign in, choose a role and finish a profile.
3. In the Firebase console, **Firestore Database** > **Data** shows `users`, `idHashes` and `auditLog`; **Storage** > **Files** shows `photos/<uid>/`.

## 4. Netlify (20 minutes)

### 4.1 Connect the repository

1. Sign in at https://app.netlify.com with GitHub.
2. **Add new site** (or **Add new project**) > **Import an existing project** > **GitHub**. Authorise Netlify, and allow it the `first-shift` repository only.
3. Choose `first-shift`. **Branch to deploy:** `main`. The build command (`npm run build`) and publish directory (`.next`) come from `netlify.toml`; leave them as shown. Netlify recognises Next.js and adds its Next.js runtime itself.
4. **Don't deploy yet.** Choose **Add environment variables** on this screen if offered, or click **Deploy** and fix the variables straight after (the first deploy will show false values until they're set).

### 4.2 Environment variables

**Site configuration** > **Environment variables** > **Add a variable** > **Add a single variable**, once for each row. For each, leave **Scopes** on all, and **Same value for all deploy contexts**.

| Set these | Value | Mark **Contains secret values** |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Same as `.env.local` | No |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same | No |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same | No |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same | No |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same | No |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same | No |
| `FIREBASE_ADMIN_PROJECT_ID` | Same | No |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Same | No |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Same, but **without** the surrounding double quotes: start at `-----BEGIN` and end at `\n` | **Yes** |
| `ID_HASH_SECRET` | **Exactly the same** as `.env.local` | **Yes** |
| `ANTHROPIC_API_KEY` | From part 6 | **Yes** |
| `AI_DAILY_REQUESTS_PER_USER` | `30` | No |

**Never set these on Netlify**, in any context:

| Never set | Why |
| --- | --- |
| `NEXT_PUBLIC_USE_EMULATORS` | Switches the browser to the emulators (it does nothing off `localhost`, but `/api/health` would report it, and the pre-submit checklist fails) |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST` | Point the server at emulators that don't exist on Netlify: every request would fail |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Push alerts are cut; leave it unset |
| `NODE_ENV` | Netlify sets it; overriding it breaks the build |
| `E2E_BASE_URL` | Local test scripts only |

### 4.3 Deploy

1. **Deploys** > **Trigger deploy** > **Deploy site**. The build takes 3 to 6 minutes. If it fails, open the deploy log, copy the last 40 lines and send them to me.
2. **Site configuration** > **Site details** > **Change site name**: something like `first-shift-za`. The address becomes `https://first-shift-za.netlify.app`. Keep the default `netlify.app` subdomain: no custom domain (AGENTS.md, lesson 3).
3. Back in Firebase: **Authentication** > **Settings** > **Authorized domains** > **Add domain** > `first-shift-za.netlify.app` (your name) > **Add**.

### 4.4 Check `/api/health`

```bash
curl https://first-shift-za.netlify.app/api/health
```

Every value under `configured` must be `true`, and `"emulators"` must be `false`. Any `false`: that variable is missing or misspelt on Netlify. Fix it, then **Trigger deploy** again (variables starting `NEXT_PUBLIC_` are built into the page, so they need a new deploy, not just a restart).

## 5. Claude (10 minutes)

1. Sign in at https://console.anthropic.com.
2. **Settings** > **Limits** (or **Billing** > **Limits**): set a monthly spend limit of `$5`. The eval costs a few cents; the live app's drafting and checking cost a fraction of a cent per tryout.
3. **API keys** > **Create key**. **Name:** `first-shift`. Copy the key (it's shown once).
4. Put it in `.env.local` as `ANTHROPIC_API_KEY`, and on Netlify as in 4.2 (marked secret). Trigger a Netlify deploy.
5. Run the eval on the laptop:

   ```bash
   npm run eval:ai
   ```

   It prints a table of 20 cases and ends with **All 20 cases passed.** Copy the whole table and send it to me, pass or fail; I record it in SECURITY.md. If any case fails, don't change the prompts yourself: send the table.

## 5b. Demo accounts for judges (10 minutes)

Judges sign in with an email and password instead of Google. Only the two accounts you create here can do that.

1. Firebase console > **Build** > **Authentication** > **Sign-in method** tab > **Add new provider** > **Email/Password**. Switch **Email/Password** on. Leave **Email link (passwordless sign-in)** off. **Save**.
2. Still in **Authentication**, open the **Settings** tab > **User actions**. Untick **Enable create (sign-up)**, so nobody can register with a password. Leave **Enable deletion** as it is. **Save**.
3. On the laptop, run:

   ```bash
   npm run demo:accounts
   ```

   It says `Target: the LIVE project first-shift-a5388`, creates a business and a young person account, and prints both passwords once. Copy them straight into your password manager: they aren't stored anywhere else. Running it again changes nothing; `npm run demo:accounts -- --reset business` (or `young_person`) gives one a new password.
4. On https://firstshiftza.netlify.app/sign-in, tap **Judges and testers: use a demo account** and sign in with each. Each starts at the role screen until demo mode fills in their profiles.

## 6. Final checks

Tick each one, on the live site unless it says otherwise:

- [ ] `npm run verify` and `npm run rules` pass locally, and the latest Netlify deploy is **Published** (its build ran `npm run verify`)
- [ ] `https://<name>.netlify.app/api/health`: `firebaseAdmin`, `anthropic`, `idHashing` and `photoStorage` all `true`, `"emulators": false`
- [ ] On **your phone**, on mobile data: open the live site, **Continue with Google** with a real account, choose **I'm looking for work**, and finish the profile, including a photo taken with the camera
- [ ] With a **second Google account** (on the phone or a laptop): choose **I run a business**, and finish the profile including the pin (at your business, or anywhere with good GPS) and a shopfront photo
- [ ] Firebase console: both people under `users`, the business under `businesses`, photos under `photos/`, and entries in `auditLog`
- [ ] `npm run eval:ai`: all 20 passed, table sent to me
- [ ] The $1 budget alert exists, and the Anthropic spend limit is set
- [ ] The service account `.json` file is outside the project folder, and `git status` shows no `.env` file staged

Then send me the `/api/health` output, the eval table, and anything that didn't match this guide.
