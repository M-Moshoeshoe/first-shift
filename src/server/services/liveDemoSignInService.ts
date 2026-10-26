import "server-only";
import { z } from "zod";
import { DEMO_ROLES } from "@/config/demo";
import { adminAuth, adminDb } from "../firebaseAdmin";
import { createDemoSignInService, type DemoAccount, type DemoSignInService } from "./demoSignInService";

const DemoAccountSchema = z.object({ uid: z.string(), email: z.string(), role: z.enum(DEMO_ROLES), salt: z.string(), hash: z.string() });

/** The claims every demo account carries; requireUser reads demo, demo:reset finds the accounts by role. */
export const demoClaims = (account: Pick<DemoAccount, "role">) => ({ demo: true, demoRole: account.role });

async function restore(account: DemoAccount): Promise<void> {
  const auth = adminAuth();
  const user = await auth.getUser(account.uid).catch((error: { code?: string }) => {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  });
  if (!user) {
    await auth.createUser({ uid: account.uid, email: account.email, emailVerified: true });
  } else if (user.email !== account.email || user.disabled || !user.emailVerified) {
    await auth.updateUser(account.uid, { email: account.email, emailVerified: true, disabled: false });
  }
  const claims = demoClaims(account);
  const current = user?.customClaims ?? {};
  if (current.demo !== claims.demo || current.demoRole !== claims.demoRole) await auth.setCustomUserClaims(account.uid, claims);
}

/** The demo sign-in wired to Firestore (demoAccounts) and Firebase Auth. The route uses this; tests use fakes. */
export function liveDemoSignInService(): DemoSignInService {
  return createDemoSignInService({
    async findByEmail(email) {
      const snapshot = await adminDb().collection("demoAccounts").where("email", "==", email).limit(1).get();
      const doc = snapshot.docs[0];
      return doc ? DemoAccountSchema.parse(doc.data()) : null;
    },
    async findByRole(role) {
      const doc = await adminDb().collection("demoAccounts").doc(role).get();
      return doc.exists ? DemoAccountSchema.parse(doc.data()) : null;
    },
    restore,
    mintToken: (uid) => adminAuth().createCustomToken(uid),
  });
}
