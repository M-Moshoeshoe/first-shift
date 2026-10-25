import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDayService, liveOfferService } from "@/server/services/liveBookingServices";

export const dynamic = "force-dynamic";

/**
 * The nav badge: new applicants for an owner, offers waiting for a young
 * person. Every account screen asks for it, so this is also where the payment
 * deadlines are applied whenever either party opens the app (dayService.ts).
 */
export async function GET(request: Request) {
  try {
    const viewer = await requireUser(request);
    await liveDayService().sweepDeadlines(viewer);
    return NextResponse.json(await liveOfferService().badges(viewer), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/badges");
  }
}
