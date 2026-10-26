import { NextResponse } from "next/server";
import { HireAnswerInputSchema } from "@/schemas/record";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveHireService } from "@/server/services/liveRecordServices";
import { parseBody, parseId } from "@/server/validate";

const NOT_FOUND = "We cannot find that job offer. Go back to Applications and check.";

/** The young person answers a job offer, once: "I'm interested" (with a WhatsApp message to the owner) or "Not right now". */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, NOT_FOUND);
    const { answer } = await parseBody(request, HireAnswerInputSchema);
    return NextResponse.json(await liveHireService().answer(viewer, id, answer));
  } catch (error) {
    return toErrorResponse(error, "POST /api/job-offers/[id]/answer");
  }
}
