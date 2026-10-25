import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { MarkPaidSchema } from "@/schemas/booking";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDayService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** The owner says they sent the payment themselves, with the method and the amount. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const { method, amountCents } = await parseBody(request, MarkPaidSchema);
    return NextResponse.json(await liveDayService().markPaid(viewer, id, method, amountCents));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/paid");
  }
}
