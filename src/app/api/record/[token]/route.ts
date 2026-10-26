import { NextResponse } from "next/server";
import { RECORD_COPY } from "@/domain/recordCopy";
import { AppError, toErrorResponse } from "@/server/errors";
import { liveReferenceService } from "@/server/services/liveRecordServices";
export const dynamic = "force-dynamic";

/**
 * A shared work record, for anyone with the link: no sign-in. Approved
 * content only, never an ID, a surname or a phone number. An unknown token
 * and a malformed one look the same.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const record = await liveReferenceService().shared((await params).token);
    if (!record) throw new AppError(404, "not_found", RECORD_COPY.publicMissing);
    return NextResponse.json(record, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/record/[token]");
  }
}
