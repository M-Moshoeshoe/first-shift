import { NextResponse } from "next/server";
import { safeParse } from "zod/v4/core";
import { FINDING_MESSAGES } from "@/domain/findingMessages";
import { TryoutIdSchema } from "@/schemas/tryout";
import { requireUser } from "@/server/auth";
import { AppError, toErrorResponse } from "@/server/errors";
import { liveFindingService } from "@/server/services/liveFindingService";

export const dynamic = "force-dynamic";

/** One tryout for a young person: the slip, the tasks, and whether they can apply. Never the exact address. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = safeParse(TryoutIdSchema, (await params).id);
    if (!id.success) throw new AppError(404, "not_found", FINDING_MESSAGES.notFound);
    return NextResponse.json(await liveFindingService().detail(viewer, id.data), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "GET /api/tryouts/[id]");
  }
}
