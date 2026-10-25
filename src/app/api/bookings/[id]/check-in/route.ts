import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { DoorCheckSchema } from "@/schemas/booking";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDayService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** The owner checks the young person in at the door: the door check and the code they show. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const check = await parseBody(request, DoorCheckSchema);
    return NextResponse.json(await liveDayService().checkIn(viewer, id, check));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/check-in");
  }
}
