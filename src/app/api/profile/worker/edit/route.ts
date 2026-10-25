import { NextResponse } from "next/server";
import { WorkerEditSchema } from "@/schemas/profile";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveProfileService } from "@/server/services/liveProfileService";
import { parseBody } from "@/server/validate";

/** A young person changes their finished profile, such as how businesses can pay them. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    const input = await parseBody(request, WorkerEditSchema);
    return NextResponse.json(await liveProfileService().editWorker(viewer, input));
  } catch (error) {
    return toErrorResponse(error, "POST /api/profile/worker/edit");
  }
}
