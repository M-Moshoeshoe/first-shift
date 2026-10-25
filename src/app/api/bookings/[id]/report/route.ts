import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { ReportSchema } from "@/schemas/booking";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveBookingService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** Report a problem on a booking. Harassment or unsafe work reported by the young person pauses the business at once. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const { category, note } = await parseBody(request, ReportSchema);
    return NextResponse.json(await liveBookingService().report(viewer, id, category, note ?? ""));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/report");
  }
}
