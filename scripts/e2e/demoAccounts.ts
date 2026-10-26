import { randomBytes } from "node:crypto";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { apiPostSignedOut } from "../../src/lib/api";
import { clientAuth } from "../../src/lib/firebaseClient";
import { DemoTokenSchema } from "../../src/schemas/demo";

/**
 * The demo accounts npm run e2e:demo sets up with npm run demo:accounts and
 * signs in as. Throwaway accounts for the check: the real demo passwords
 * never appear in the repo.
 */
export const THABO = { email: "e2e-thabo@firstshift.demo", password: randomBytes(12).toString("base64url") };
export const SIPHO = { email: "e2e-sipho@firstshift.demo", password: randomBytes(12).toString("base64url") };

/** Signs in through our server with the public password, as the sign-in page does. */
export async function demoSignIn(email: string, password: string): Promise<void> {
  const { token } = await apiPostSignedOut("/api/demo/sign-in", { email, password }, DemoTokenSchema);
  await signInWithCustomToken(clientAuth(), token);
}

/** Signs out, then in as Thabo or Sipho. */
export async function switchTo(who: "thabo" | "sipho"): Promise<void> {
  await signOut(clientAuth());
  const { email, password } = who === "thabo" ? THABO : SIPHO;
  await demoSignIn(email, password);
}
