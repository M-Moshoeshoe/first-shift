import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveBookingService } from "@/server/services/liveBookingServices";
import { parseId } from "@/server/validate";

/** Either party cancels before the start: free or late by the cancellation rules, settled by settle(). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    return NextResponse.json(await liveBookingService().cancel(viewer, id));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/cancel");
  }
}
