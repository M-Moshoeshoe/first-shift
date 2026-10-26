import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveReferenceService } from "@/server/services/liveRecordServices";
import { parseId } from "@/server/validate";
export const dynamic = "force-dynamic";

/** The reference on a booking: the young person's to review, or the owner's own answers, read-only. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    return NextResponse.json(await liveReferenceService().view(viewer, id), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/bookings/[id]/reference");
  }
}

/** Writes the reference after Received, from the owner's answers and the tasks only (AI, daily limit). Once. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    return NextResponse.json(await liveReferenceService().draft(viewer, id));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/reference");
  }
}
