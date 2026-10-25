import { NextResponse } from "next/server";
import { PostTryoutSchema } from "@/schemas/tryout";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveTryoutService } from "@/server/services/liveTryoutService";
import { parseBody } from "@/server/validate";

/** Posts a reviewed tryout: every rule checked again here, and the work checked again on the final text. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    // The schema accepts only supervisionConfirmed: true, so an unconfirmed post never reaches the service.
    const input = await parseBody(request, PostTryoutSchema);
    return NextResponse.json(await liveTryoutService().post(viewer, input));
  } catch (error) {
    return toErrorResponse(error, "POST /api/tryouts");
  }
}
