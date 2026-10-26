import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveHireService } from "@/server/services/liveRecordServices";
import { parseBody, parseId } from "@/server/validate";
import { JobOfferInputSchema } from "@/schemas/record";
export const dynamic = "force-dynamic";

/** Whether "Offer {name} a job" is due on this booking, for its owner. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    return NextResponse.json(await liveHireService().view(viewer, id), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/bookings/[id]/hire");
  }
}

/** Records the invitation or the job offer, once per pair, and returns the prefilled WhatsApp message for the owner to send. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const input = await parseBody(request, JobOfferInputSchema);
    return NextResponse.json(await liveHireService().offer(viewer, id, input));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/hire");
  }
}
