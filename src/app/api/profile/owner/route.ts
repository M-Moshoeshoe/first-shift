import { NextResponse } from "next/server";
import { OwnerSchema } from "@/schemas/profile";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveProfileService } from "@/server/services/liveProfileService";
import { parseBody } from "@/server/validate";

/** The business owner's own details. The full ID number is never stored, logged or returned. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    const input = await parseBody(request, OwnerSchema);
    return NextResponse.json(await liveProfileService().saveOwner(viewer, input));
  } catch (error) {
    return toErrorResponse(error, "POST /api/profile/owner");
  }
}
