import { NextResponse } from "next/server";
import { OFFER_PROBLEM_MESSAGES } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveOfferService } from "@/server/services/liveBookingServices";
import { parseId } from "@/server/validate";

/** The owner has looked at this tryout's applicants: they stop counting towards the nav badge. Only the owner's own applications change. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, OFFER_PROBLEM_MESSAGES.not_found);
    await liveOfferService().markSeen(viewer, id);
    return NextResponse.json({ status: "seen" });
  } catch (error) {
    return toErrorResponse(error, "POST /api/tryouts/[id]/seen");
  }
}
