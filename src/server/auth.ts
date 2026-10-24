import "server-only";
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

  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    return { uid: decoded.uid };
  } catch {
    throw new AppError(401, "session_expired", "Your session has ended. Sign in again.");
  }
}
