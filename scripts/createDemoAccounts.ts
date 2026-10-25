import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { DEMO_ROLES, type DemoRole } from "../src/config/demo";
import { isDemoEmail } from "../src/domain/demo";
import { hashDemoPassword } from "../src/server/demoPassword";
import { adminAuth, adminDb } from "../src/server/firebaseAdmin";
import { demoClaims } from "../src/server/services/liveDemoSignInService";
import { announceTarget, flag } from "./adminTarget";

/**
 * Sets up the two demo accounts judges and testers sign in with: a business
 * and a young person, with the email and password you choose. They come from
 * flags, or from .env.demo.local (ignored by Git, never read by Next.js):
 *
 *   DEMO_BUSINESS_EMAIL=...        DEMO_BUSINESS_PASSWORD=...
 *   DEMO_YOUNG_PERSON_EMAIL=...    DEMO_YOUNG_PERSON_PASSWORD=...
 *
 *   npm run demo:accounts
 *   npm run demo:accounts -- --business-email x --business-password y --young-person-email x --young-person-password y
 *
 * The passwords are public (they're in the slides), so they never go in the
 * repo and they aren't what protects anyone: demo isolation is. The server
 * checks them against a salted hash in demoAccounts (server-only) and signs
 * the judge in with its own token; Firebase's password sign-in is switched off
 * and refused (domain/signIn.ts). Running it again with the same values
 * changes nothing a judge would notice. Then run npm run demo:reset.
 */
const ENV_PREFIX: Record<DemoRole, string> = { business: "DEMO_BUSINESS", young_person: "DEMO_YOUNG_PERSON" };
const FLAG_PREFIX: Record<DemoRole, string> = { business: "business", young_person: "young-person" };
const DISPLAY_NAME: Record<DemoRole, string> = { business: "Demo business", young_person: "Demo young person" };

const args = process.argv.slice(2);

function credentials(role: DemoRole): { email: string; password: string } {
  const email = (flag(args, `${FLAG_PREFIX[role]}-email`) ?? process.env[`${ENV_PREFIX[role]}_EMAIL`] ?? "").trim().toLowerCase();
  const password = flag(args, `${FLAG_PREFIX[role]}-password`) ?? process.env[`${ENV_PREFIX[role]}_PASSWORD`] ?? "";
  if (!isDemoEmail(email)) throw new Error(`${role}: the email must end in @firstshift.demo (set --${FLAG_PREFIX[role]}-email or ${ENV_PREFIX[role]}_EMAIL in .env.demo.local).`);
  if (password.length < 8) throw new Error(`${role}: the password must be at least 8 characters (--${FLAG_PREFIX[role]}-password or ${ENV_PREFIX[role]}_PASSWORD).`);
  return { email, password };
}

/** The account this role already has: the one on record, or one made before demoAccounts existed (found by its claim). */
async function existingUid(role: DemoRole, email: string): Promise<string | null> {
  const recorded = await adminDb().collection("demoAccounts").doc(role).get();
  if (recorded.exists) return String(recorded.get("uid"));
  let pageToken: string | undefined;
  do {
    const page = await adminAuth().listUsers(1000, pageToken);
    const found = page.users.find((user) => user.customClaims?.demoRole === role || user.email === email);
    if (found) return found.uid;
    pageToken = page.pageToken;
  } while (pageToken);
  return null;
}

/**
 * Firebase's own settings: no email and password sign-in, no sign-up and no
 * deleting an account from the browser, for anyone. Every account signs in
 * with Google or, for the demo accounts, through our server. Live project only.
 */
async function lockDownProject(project: string): Promise<void> {
  const credential = adminAuth().app.options.credential;
  if (!credential) throw new Error("No Admin credential to change the project's sign-in settings with.");
  const { access_token: token } = await credential.getAccessToken();
  const mask = ["signIn.email.enabled", "client.permissions.disabledUserSignup", "client.permissions.disabledUserDeletion"].join(",");
  const response = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config?updateMask=${mask}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ signIn: { email: { enabled: false } }, client: { permissions: { disabledUserSignup: true, disabledUserDeletion: true } } }),
  });
  if (!response.ok) {
    throw new Error(`Couldn't change the sign-in settings (${response.status}). In the Firebase console, Authentication: switch Email/Password off under Sign-in method, and untick Enable create and Enable deletion under Settings, User actions.`);
  }
  console.log("Project: Email/Password sign-in off, sign-up off, deleting from the browser off.");
}

async function main(): Promise<void> {
  const project = announceTarget();
  const auth = adminAuth();
  for (const role of DEMO_ROLES) {
    const { email, password } = credentials(role);
    const uid = await existingUid(role, email);
    // A random Firebase password nobody knows: the public one is checked by our server, never by Firebase.
    const account = { email, emailVerified: true, password: randomBytes(24).toString("base64url"), displayName: DISPLAY_NAME[role], disabled: false };
    // An account deleted since it was recorded comes back under the same uid, so its demo data still fits.
    const user = uid
      ? await auth.updateUser(uid, account).catch((error: { code?: string }) => {
          if (error.code === "auth/user-not-found") return auth.createUser({ uid, ...account });
          throw error;
        })
      : await auth.createUser(account);
    await auth.setCustomUserClaims(user.uid, demoClaims({ role }));
    const at = FieldValue.serverTimestamp();
    const batch = adminDb().batch();
    batch.set(adminDb().collection("demoAccounts").doc(role), { uid: user.uid, email, role, ...hashDemoPassword(password), updatedAt: at });
    batch.create(adminDb().collection("auditLog").doc(), { uid: user.uid, action: "demo_account_set", at });
    await batch.commit();
    console.log(`${role}: ${uid ? "updated" : "created"} ${email} (uid ${user.uid})`);
  }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) console.log("Emulators: the project's sign-in settings are left as they are.");
  else await lockDownProject(project);
  console.log("\nDone. Now run npm run demo:reset to give both accounts their demo data.");
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
