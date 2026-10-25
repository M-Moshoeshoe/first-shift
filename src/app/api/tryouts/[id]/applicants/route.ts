import { NextResponse } from "next/server";
import { OFFER_PROBLEM_MESSAGES } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveOfferService } from "@/server/services/liveBookingServices";
import { parseId } from "@/server/validate";
export const dynamic = "force-dynamic";

/** The owner's own tryout with its applicants ranked. Anyone else's tryout reads as not found. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, OFFER_PROBLEM_MESSAGES.not_found);
    return NextResponse.json(await liveOfferService().ownerTryout(viewer, id), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/tryouts/[id]/applicants");
  }
}
