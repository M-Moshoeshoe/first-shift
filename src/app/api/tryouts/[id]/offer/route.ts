import { NextResponse } from "next/server";
import { OFFER_PROBLEM_MESSAGES } from "@/domain/bookingMessages";
import { OfferSchema } from "@/schemas/booking";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveOfferService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** The owner offers the tryout to one applicant. One offer waits at a time; offering again to the same person changes nothing. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, OFFER_PROBLEM_MESSAGES.not_found);
    const { workerId } = await parseBody(request, OfferSchema);
    return NextResponse.json(await liveOfferService().offer(viewer, id, workerId));
  } catch (error) {
    return toErrorResponse(error, "POST /api/tryouts/[id]/offer");
  }
}
