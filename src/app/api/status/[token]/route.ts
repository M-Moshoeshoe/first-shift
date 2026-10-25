import { NextResponse } from "next/server";
import { STATUS_PAGE_COPY } from "@/domain/bookingStatus";
import { AppError, toErrorResponse } from "@/server/errors";
import { liveBookingService } from "@/server/services/liveBookingServices";

export const dynamic = "force-dynamic";

/**
 * The public status page's data: no sign-in, because the unguessable token
 * is the permission. First names, the business, the times and the status
 * only. An unknown and an expired token answer the same, so a guess learns nothing.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const view = await liveBookingService().status((await params).token);
    if (!view) throw new AppError(404, "not_found", STATUS_PAGE_COPY.unavailable);
    return NextResponse.json(view, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/status/[token]");
  }
}
