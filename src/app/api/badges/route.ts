import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveOfferService } from "@/server/services/liveBookingServices";

export const dynamic = "force-dynamic";

/** The nav badge: new applicants for an owner, offers waiting for a young person. Push alerts are cut, so this is how people notice. */
export async function GET(request: Request) {
  try {
    const viewer = await requireUser(request);
    return NextResponse.json(await liveOfferService().badges(viewer), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/badges");
  }
}
