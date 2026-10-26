import { NextResponse } from "next/server";
import { REFERENCE_COPY } from "@/domain/recordCopy";
import { ReferenceDecisionSchema } from "@/schemas/record";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveReferenceService } from "@/server/services/liveRecordServices";
import { parseBody, parseId } from "@/server/validate";

/** "Add to my record" or "Challenge it", by the young person the reference is about. A challenge opens a review case. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, REFERENCE_COPY.notYet);
    const choice = await parseBody(request, ReferenceDecisionSchema);
    return NextResponse.json(await liveReferenceService().decide(viewer, id, choice));
  } catch (error) {
    return toErrorResponse(error, "POST /api/references/[id]");
  }
}
