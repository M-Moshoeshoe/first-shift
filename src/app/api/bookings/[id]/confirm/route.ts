import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { ConfirmSchema } from "@/schemas/booking";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDayService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** The young person says whether the payment arrived. Not received goes to review. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const { received } = await parseBody(request, ConfirmSchema);
    return NextResponse.json(await liveDayService().confirm(viewer, id, received));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/confirm");
  }
}
