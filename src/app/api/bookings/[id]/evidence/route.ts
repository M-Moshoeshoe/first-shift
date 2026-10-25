import { NextResponse } from "next/server";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { EvidenceSchema } from "@/schemas/day";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDayService } from "@/server/services/liveBookingServices";
import { parseBody, parseId } from "@/server/validate";

/** Proof after Not received: one screenshot and a note from each side, to a private path only an admin reads. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = parseId((await params).id, BOOKING_COPY.notFound);
    const { image, note } = await parseBody(request, EvidenceSchema);
    return NextResponse.json(await liveDayService().addEvidence(viewer, id, new Uint8Array(Buffer.from(image, "base64")), note ?? ""));
  } catch (error) {
    return toErrorResponse(error, "POST /api/bookings/[id]/evidence");
  }
}
