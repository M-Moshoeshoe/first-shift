import { NextResponse } from "next/server";
import { safeParse } from "zod/v4/core";
import { FINDING_MESSAGES } from "@/domain/findingMessages";
import { TryoutIdSchema } from "@/schemas/tryout";
import { requireUser } from "@/server/auth";
import { AppError, toErrorResponse } from "@/server/errors";
import { liveFindingService } from "@/server/services/liveFindingService";

/** The young person withdraws their own application to this tryout. Anyone else's reads as not found. */
export async function POST(request: Request, { params }: { params: Promise<{ tryoutId: string }> }) {
  try {
    const viewer = await requireUser(request);
    const id = safeParse(TryoutIdSchema, (await params).tryoutId);
    if (!id.success) throw new AppError(404, "not_found", FINDING_MESSAGES.applicationNotFound);
    return NextResponse.json(await liveFindingService().withdraw(viewer, id.data));
  } catch (error) {
    return toErrorResponse(error, "POST /api/applications/[tryoutId]/withdraw");
  }
}
