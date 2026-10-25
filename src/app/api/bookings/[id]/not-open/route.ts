import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDayService } from "@/server/services/liveBookingServices";
import { parseId } from "@/server/validate";

/** The young person says the business wasn't open, after the start. It goes to review. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    return NextResponse.json(await liveDayService().businessNotOpen(viewer, id));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/not-open");
  }
}
