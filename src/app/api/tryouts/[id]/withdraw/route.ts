import { NextResponse } from "next/server";
import { safeParse } from "zod/v4/core";
import { TRYOUT_MESSAGES } from "@/domain/tryoutMessages";
import { TryoutIdSchema } from "@/schemas/tryout";
import { requireUser } from "@/server/auth";
import { AppError, toErrorResponse } from "@/server/errors";
import { liveTryoutService } from "@/server/services/liveTryoutService";

/** The owner withdraws a tryout nobody is booked on. Someone else's tryout reads as not found. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireUser(request);
    const id = safeParse(TryoutIdSchema, (await params).id);
    if (!id.success) throw new AppError(404, "not_found", TRYOUT_MESSAGES.notFound);
    return NextResponse.json(await liveTryoutService().withdraw(uid, id.data));
  } catch (error) {
    return toErrorResponse(error, "POST /api/tryouts/[id]/withdraw");
  }
}
