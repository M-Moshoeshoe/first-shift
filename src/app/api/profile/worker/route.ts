import { NextResponse } from "next/server";
import { YoungPersonProfileSchema } from "@/schemas/profile";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveProfileService } from "@/server/services/liveProfileService";
import { parseBody } from "@/server/validate";

/** Saves a young person's details and claims their ID. The full ID number is never stored, logged or returned. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    const input = await parseBody(request, YoungPersonProfileSchema);
    return NextResponse.json(await liveProfileService().saveWorker(viewer, input));
  } catch (error) {
    return toErrorResponse(error, "POST /api/profile/worker");
  }
}
