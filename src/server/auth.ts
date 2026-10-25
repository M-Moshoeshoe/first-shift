import "server-only";
import type { Viewer } from "@/domain/demo";
import { isAllowedSignIn } from "@/domain/signIn";
import { AppError } from "./errors";
import { adminAuth } from "./firebaseAdmin";

export type SignedInUser = Viewer;

/** Every signed-in route starts here. A missing, expired or forged token is rejected. */
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
  // The demo claim is set only by the server (scripts/createDemoAccounts.ts), so it can't be forged.
  const demo = decoded.demo === true;
  if (!isAllowedSignIn(decoded.firebase?.sign_in_provider, { demo, email: decoded.email })) {
    throw new AppError(403, "sign_in_not_allowed", "That account can't use First Shift. Sign in with Google instead.");
  }
  return { uid: decoded.uid, demo };
}
