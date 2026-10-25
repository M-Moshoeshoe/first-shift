import { NextResponse } from "next/server";
import { DraftRequestSchema } from "@/schemas/tryout";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveTryoutService } from "@/server/services/liveTryoutService";
import { parseBody } from "@/server/validate";

/** One sentence to a draft tryout, checked for unsafe work at the same time. Nothing is written. */
export async function POST(request: Request) {
  try {
    const { uid } = await requireUser(request);
    const { description } = await parseBody(request, DraftRequestSchema);
    return NextResponse.json(await liveTryoutService().draft(uid, description));
  } catch (error) {
    return toErrorResponse(error, "POST /api/tryouts/draft");
  }
}
