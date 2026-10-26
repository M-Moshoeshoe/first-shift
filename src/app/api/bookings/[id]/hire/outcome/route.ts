import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { HireOutcomeInputSchema } from "@/schemas/record";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveHireService } from "@/server/services/liveRecordServices";
import { parseBody, parseId } from "@/server/validate";

/** The owner marks how the job offer went, once: Hired, or Did not work out. Counted in the pilot metrics. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const { outcome } = await parseBody(request, HireOutcomeInputSchema);
    return NextResponse.json(await liveHireService().outcome(viewer, id, outcome));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/hire/outcome");
  }
}
