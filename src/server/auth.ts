import "server-only";
import { isAllowedSignIn } from "@/domain/signIn";
import { AppError } from "./errors";
import { adminAuth } from "./firebaseAdmin";

export interface SignedInUser {
  uid: string;
}

/** Every write route starts here. A missing, expired or forged token is rejected. */
export async function requireUser(request: Request): Promise<SignedInUser> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) throw new AppError(401, "not_signed_in", "Sign in to continue.");

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token, true);
  } catch {
    throw new AppError(401, "session_expired", "Your session has ended. Sign in again.");
  }
  // A password works only on a demo account (domain/signIn.ts), even if Firebase's sign-up were switched back on.
  if (!isAllowedSignIn(decoded.firebase?.sign_in_provider, decoded.demo === true)) {
    throw new AppError(403, "sign_in_not_allowed", "That account can't use First Shift. Sign in with Google instead.");
  }
  return { uid: decoded.uid };
}
