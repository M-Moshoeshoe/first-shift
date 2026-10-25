import { randomBytes } from "node:crypto";
import { adminAuth } from "../src/server/firebaseAdmin";
import { announceTarget } from "./adminTarget";

/**
 * Creates the two demo accounts judges and testers sign in with: a business
 * and a young person, marked with the demo claim the server checks
 * (domain/signIn.ts). Their passwords are generated here and printed once, to
 * this terminal only; they're never written to a file or committed. Running it
 * again leaves existing accounts alone; --reset gives one a new password.
 * Their profiles and demo data come with demo mode.
 *
 *   npm run demo:accounts                  creates any that don't exist
 *   npm run demo:accounts -- --reset business   new password for the business account
 */
const ACCOUNTS = [
  // Plus-addresses of the support inbox: real, so a password reset reaches the team, and plainly demo.
  { key: "business", email: "firstshift.support+demo-business@gmail.com", displayName: "Demo business" },
  { key: "young_person", email: "firstshift.support+demo-young-person@gmail.com", displayName: "Demo young person" },
] as const;

const resetIndex = process.argv.indexOf("--reset");
const reset = resetIndex >= 0 ? process.argv[resetIndex + 1] : undefined;
if (reset && !ACCOUNTS.some((account) => account.key === reset)) {
  console.error(`--reset takes one of: ${ACCOUNTS.map((account) => account.key).join(", ")}`);
  process.exit(1);
}

/** 24 random characters from a 64-character set: about 144 bits, far past guessing. */
const newPassword = (): string => randomBytes(18).toString("base64url");

async function main(): Promise<void> {
  announceTarget();
  const auth = adminAuth();
  const printed: { account: string; email: string; password: string }[] = [];
  for (const account of ACCOUNTS) {
    const existing = await auth.getUserByEmail(account.email).catch((error: { code?: string }) => {
      if (error.code === "auth/user-not-found") return null;
      throw error;
    });
    if (existing && reset !== account.key) {
      console.log(`${account.key}: already exists (${account.email}), left as it is. Use --reset ${account.key} for a new password.`);
      continue;
    }
    const password = newPassword();
    const user = existing
      ? await auth.updateUser(existing.uid, { password })
      : await auth.createUser({ email: account.email, emailVerified: true, password, displayName: account.displayName });
    await auth.setCustomUserClaims(user.uid, { demo: true, demoRole: account.key });
    printed.push({ account: account.key, email: account.email, password });
  }
  if (printed.length === 0) return;
  console.log("\nDemo accounts. These passwords are shown once and stored nowhere: copy them into your password manager now.\n");
  console.table(printed);
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
