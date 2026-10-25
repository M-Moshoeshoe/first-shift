import { NextResponse } from "next/server";
import { safeParse } from "zod/v4/core";
import { PhotoSchema } from "@/schemas/profile";
import { requireUser } from "@/server/auth";
import { AppError, toErrorResponse } from "@/server/errors";
import { liveBookingService } from "@/server/services/liveBookingServices";
import { parseId } from "@/server/validate";

export const dynamic = "force-dynamic";

const NOT_FOUND = "No photo to show.";

/** A photo the viewer may see (bookings.ts, mayViewPhoto), through the server, so Storage never opens other people's folders to browsers. */
export async function GET(request: Request, { params }: { params: Promise<{ uid: string; kind: string }> }) {
  try {
    const viewer = await requireUser(request);
    const { uid, kind } = await params;
    const parsed = safeParse(PhotoSchema, { kind });
    if (!parsed.success) throw new AppError(404, "not_found", NOT_FOUND);
    const file = await liveBookingService().photo(viewer, parseId(uid, NOT_FOUND), parsed.data.kind);
    if (!file) throw new AppError(404, "not_found", NOT_FOUND);
    return new NextResponse(Buffer.from(file.bytes), { headers: { "content-type": file.contentType, "cache-control": "private, max-age=300" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/photos/[uid]/[kind]");
  }
}
