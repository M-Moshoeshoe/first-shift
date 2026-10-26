import { FirebaseError } from "firebase/app";
import { signInWithCustomToken } from "firebase/auth";
import type { DemoRole } from "@/config/demo";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { demoSignInErrorMessage } from "@/domain/messages";
import { fail, ok, type Result } from "@/domain/result";
import { DemoTokenSchema } from "@/schemas/demo";
import { ApiError, apiPostSignedOut } from "@/lib/api";
import { clientAuth } from "@/lib/firebaseClient";

/** Signs in with the server's token, saying which button to tap again if the last step fails. */
async function signInWithToken(fetchToken: () => Promise<{ token: string }>, button: string): Promise<Result<true, string>> {
  try {
    const { token } = await fetchToken();
    await signInWithCustomToken(clientAuth(), token);
    return ok(true);
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message);
    const code = error instanceof FirebaseError ? error.code : "unknown";
    console.warn("demo_sign_in_failed", code);
    return fail(demoSignInErrorMessage(code, button));
  }
}

/**
 * Signs in to a demo account. Our server checks the email and password and
 * answers with a sign-in token (server/services/demoSignInService.ts); Firebase's
 * own password sign-in isn't used, and the server refuses it (domain/signIn.ts).
 */
export function signInWithDemo(email: string, password: string): Promise<Result<true, string>> {
  return signInWithToken(() => apiPostSignedOut("/api/demo/sign-in", { email, password }, DemoTokenSchema), BUTTON_LABELS.signInToDemo);
}

/** "Try as Thabo" or "Try as Sipho": the server finds the demo account by its role, so no password is typed or sent. */
export function tryDemo(role: DemoRole): Promise<Result<true, string>> {
  const button = role === "young_person" ? BUTTON_LABELS.tryAsThabo : BUTTON_LABELS.tryAsSipho;
  return signInWithToken(() => apiPostSignedOut("/api/demo/try", { role }, DemoTokenSchema), button);
}
