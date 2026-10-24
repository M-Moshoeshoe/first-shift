import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveProfileService } from "@/server/services/liveProfileService";

export const dynamic = "force-dynamic";

/**
 * The signed-in person's own profile: what the forms fill back in and where
 * they belong next. Read on the server, so the browser never loads Firestore.
 */
export async function GET(request: Request) {
  try {
    const { uid } = await requireUser(request);
    return NextResponse.json(await liveProfileService().getProfile(uid), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/profile");
  }
}
