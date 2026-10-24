import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { signInErrorMessage } from "@/domain/messages";
import { fail, ok, type Result } from "@/domain/result";
import { clientAuth } from "@/lib/firebaseClient";

/** Opens Google's sign-in window. A failure comes back as one plain sentence from src/domain/messages.ts. */
export async function signInWithGoogle(): Promise<Result<true, string>> {
  try {
    await signInWithPopup(clientAuth(), new GoogleAuthProvider());
    return ok(true);
  } catch (error) {
    const code = error instanceof FirebaseError ? error.code : "unknown";
    console.warn("sign_in_failed", code);
    return fail(signInErrorMessage(code));
  }
}
