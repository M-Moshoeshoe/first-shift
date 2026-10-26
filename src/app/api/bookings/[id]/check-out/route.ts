import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { CheckOutSchema } from "@/schemas/booking";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDayService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** The owner checks out with how the day ended and their three answers; settle() works out what's owed. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const { reason, answers } = await parseBody(request, CheckOutSchema);
    return NextResponse.json(await liveDayService().checkOut(viewer, id, reason, answers));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/check-out");
  }
}
