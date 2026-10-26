import { NextResponse } from "next/server";
import { TERMS_VERSION } from "@/config/terms";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { recordTermsAcceptance } from "@/server/repositories/firestoreTerms";

/**
 * "By continuing, you agree to the Terms and the Privacy notice": recorded at
 * sign-in, once per version, for the signed-in person. Nothing to send: the
 * server records the version it serves (src/config/terms.ts).
 */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    const status = await recordTermsAcceptance(viewer.uid, TERMS_VERSION, viewer.demo);
    return NextResponse.json({ status, version: TERMS_VERSION }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "POST /api/terms/accept");
  }
}
