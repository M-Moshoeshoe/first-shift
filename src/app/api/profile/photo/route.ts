import { NextResponse } from "next/server";
import { PhotoSchema } from "@/schemas/profile";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveProfileService } from "@/server/services/liveProfileService";
import { parseBody } from "@/server/validate";

/**
 * Records a photo the browser has uploaded to photos/{uid}/{kind}.jpg. Only
 * the kind comes from the request; the server builds the path from the
 * signed-in uid and checks the file's type and size in Storage first.
 */
export async function POST(request: Request) {
  try {
    const { uid } = await requireUser(request);
    const { kind } = await parseBody(request, PhotoSchema);
    return NextResponse.json(await liveProfileService().savePhoto(uid, kind));
  } catch (error) {
    return toErrorResponse(error, "POST /api/profile/photo");
  }
}
