import { NextResponse } from "next/server";
import { ANSWER_PROBLEM_MESSAGES } from "@/domain/bookingMessages";
import { AnswerSchema } from "@/schemas/booking";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveOfferService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** The young person accepts or declines the offer made to them. Accepting books it, with every rule checked again here. */
export async function POST(request: Request, { params }: { params: Promise<{ tryoutId: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).tryoutId, ANSWER_PROBLEM_MESSAGES.not_found);
    const { answer } = await parseBody(request, AnswerSchema);
    return NextResponse.json(await liveOfferService().answer(viewer, id, answer));
  } catch (error) {
    return toErrorResponse(error, "POST /api/applications/[tryoutId]/answer");
  }
}
