import { FirebaseError } from "firebase/app";
import { signInWithCustomToken } from "firebase/auth";
import { demoSignInErrorMessage } from "@/domain/messages";
import { fail, ok, type Result } from "@/domain/result";
import { DemoTokenSchema } from "@/schemas/demo";
import { ApiError, apiPostSignedOut } from "@/lib/api";
import { clientAuth } from "@/lib/firebaseClient";

/**
 * Signs in to a demo account. Our server checks the email and password and
 * answers with a sign-in token (server/services/demoSignInService.ts); Firebase's
 * own password sign-in isn't used, and the server refuses it (domain/signIn.ts).
 */
export async function signInWithDemo(email: string, password: string): Promise<Result<true, string>> {
  try {
    const { token } = await apiPostSignedOut("/api/demo/sign-in", { email, password }, DemoTokenSchema);
    await signInWithCustomToken(clientAuth(), token);
    return ok(true);
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message);
    const code = error instanceof FirebaseError ? error.code : "unknown";
    console.warn("demo_sign_in_failed", code);
    return fail(demoSignInErrorMessage(code));
  }
}
