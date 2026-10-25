import { NextResponse } from "next/server";
import { BusinessProfileSchema } from "@/schemas/profile";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveProfileService } from "@/server/services/liveProfileService";
import { parseBody } from "@/server/validate";

/** Saves a business's details. The premises pin is optional here; the profile isn't complete without it. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    const input = await parseBody(request, BusinessProfileSchema);
    return NextResponse.json(await liveProfileService().saveBusiness(viewer, input));
  } catch (error) {
    return toErrorResponse(error, "POST /api/profile/business");
  }
}
