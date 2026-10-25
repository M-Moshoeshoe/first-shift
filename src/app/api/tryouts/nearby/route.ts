import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveFindingService } from "@/server/services/liveFindingService";

export const dynamic = "force-dynamic";

/**
 * Paid tryouts near the signed-in young person, open for booking. Served from
 * here rather than the Firestore SDK in the browser: a small JSON reply costs
 * young people far less data, and demo and real stay apart on the server.
 */
export async function GET(request: Request) {
  try {
    const viewer = await requireUser(request);
    return NextResponse.json(await liveFindingService().nearby(viewer), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/tryouts/nearby");
  }
}
