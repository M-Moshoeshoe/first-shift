import { NextResponse } from "next/server";
import { ApplySchema } from "@/schemas/finding";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveFindingService } from "@/server/services/liveFindingService";
import { parseBody } from "@/server/validate";

/** A young person applies for a tryout, with an optional note. Applying twice changes nothing. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    const { tryoutId, note } = await parseBody(request, ApplySchema);
    return NextResponse.json(await liveFindingService().apply(viewer, tryoutId, note ?? ""));
  } catch (error) {
    return toErrorResponse(error, "POST /api/applications");
  }
}
