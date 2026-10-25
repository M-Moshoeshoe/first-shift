import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { demoSignInErrorMessage } from "@/domain/messages";
import { fail, ok, type Result } from "@/domain/result";
import { clientAuth } from "@/lib/firebaseClient";

/**
 * Signs in to a demo account with its email and password. Only accounts the
 * team made exist (Firebase's sign-up is off), and the server accepts a
 * password sign-in only on a demo account (domain/signIn.ts).
 */
export async function signInWithDemo(email: string, password: string): Promise<Result<true, string>> {
  try {
    await signInWithEmailAndPassword(clientAuth(), email.trim(), password);
    return ok(true);
  } catch (error) {
    const code = error instanceof FirebaseError ? error.code : "unknown";
    console.warn("demo_sign_in_failed", code);
    return fail(demoSignInErrorMessage(code));
  }
}
