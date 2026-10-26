import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveBookingService } from "@/server/services/liveBookingServices";
import { parseId } from "@/server/validate";

/** Demo only: "Skip to the day" opens a demo booking's door now and keeps its times. Refused for any booking not marked demo. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    return NextResponse.json(await liveBookingService().skipToDay(viewer, id));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/skip-to-day");
  }
}
