import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveReferenceService } from "@/server/services/liveRecordServices";
export const dynamic = "force-dynamic";

/** The young person's own work record, and its share link. */
export async function GET(request: Request) {
  try {
    const viewer = await requireUser(request);
    return NextResponse.json(await liveReferenceService().record(viewer), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/record");
  }
}
