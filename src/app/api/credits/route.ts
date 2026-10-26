import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveCreditService } from "@/server/services/liveCreditService";

/** The business's own credits: the balance, the history and any request still open. */
export async function GET(request: Request) {
  try {
    const viewer = await requireUser(request);
    return NextResponse.json(await liveCreditService().view(viewer));
  } catch (error) {
    return toErrorResponse(error, "GET /api/credits");
  }
}
