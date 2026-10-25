import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveBookingService, liveDayService } from "@/server/services/liveBookingServices";
import { parseId } from "@/server/validate";
export const dynamic = "force-dynamic";

/** A booking, as this party may see it, after the payment deadlines are applied. Anyone else's reads as not found. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const reminders = await liveDayService().sweepDeadlines(viewer);
    return NextResponse.json(await liveBookingService().view(viewer, id, reminders), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/bookings/[id]");
  }
}
