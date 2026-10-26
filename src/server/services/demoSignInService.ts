import "server-only";
import type { DemoRole } from "@/config/demo";
import { isDemoEmail } from "@/domain/demo";
import { DEMO_MESSAGES } from "@/domain/messages";
import { demoPasswordMatches, hashDemoPassword, type DemoPasswordHash } from "../demoPassword";
import { AppError } from "../errors";
import { log } from "../log";

/** demoAccounts/{role}: one per demo role, written only by scripts/createDemoAccounts.ts. */
export interface DemoAccount extends DemoPasswordHash {
  uid: string;
  email: string;
  role: DemoRole;
}

export interface DemoSignInDeps {
  findByEmail: (email: string) => Promise<DemoAccount | null>;
  findByRole: (role: DemoRole) => Promise<DemoAccount | null>;
  /** Puts the Firebase account back as the script made it: its email, its demo claims, switched on, recreated if deleted. */
  restore: (account: DemoAccount) => Promise<void>;
  /** A custom token for the account, minted with the server's own credentials. */
  mintToken: (uid: string) => Promise<string>;
}

/** Checked against when no account matches, so an unknown email takes as long to refuse as a wrong password. */
const NO_ACCOUNT: DemoPasswordHash = hashDemoPassword("no demo account has this password");

/**
 * Judges sign in to the demo accounts through here, never with Firebase's own
 * password sign-in (domain/signIn.ts refuses that). The password is public, so
 * this isn't a secret check: it makes the demo accounts impossible to take
 * over. Changing the Firebase password gains nothing, and an email or claim
 * someone changed from the browser is put back at the next sign-in.
 */
export function createDemoSignInService({ findByEmail, findByRole, restore, mintToken }: DemoSignInDeps) {
  return {
    /**
     * One tap, "Try as Thabo" or "Try as Sipho": the account is found by its
     * role, so no password is needed or sent. The password is public anyway;
     * what keeps real people safe is demo isolation, not the password.
     */
    async tryAs(role: DemoRole): Promise<{ token: string }> {
      const account = await findByRole(role);
      if (!account) {
        log("error", "demo_account_missing", { role });
        throw new AppError(503, "demo_missing", DEMO_MESSAGES.notSetUp);
      }
      await restore(account);
      log("info", "demo_sign_in", { role, oneTap: true });
      return { token: await mintToken(account.uid) };
    },


    async signIn(email: string, password: string): Promise<{ token: string }> {
      const normalised = email.trim().toLowerCase();
      const account = isDemoEmail(normalised) ? await findByEmail(normalised) : null;
      // Always one hash check, and one message for every refusal, so nothing says whether an account exists.
      const matches = demoPasswordMatches(password, account ?? NO_ACCOUNT);
      if (!account || !matches) {
        log("warn", "demo_sign_in_refused", { found: account !== null });
        throw new AppError(401, "demo_credentials", DEMO_MESSAGES.wrongCredentials);
      }
      await restore(account);
      log("info", "demo_sign_in", { role: account.role });
      return { token: await mintToken(account.uid) };
    },
  };
}

export type DemoSignInService = ReturnType<typeof createDemoSignInService>;
