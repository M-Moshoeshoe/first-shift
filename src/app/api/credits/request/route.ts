import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveCreditService } from "@/server/services/liveCreditService";

/** "Request more credits": opens an admin case, once. There's no payment here: credits are added by an admin until top-ups open. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    return NextResponse.json(await liveCreditService().request(viewer));
  } catch (error) {
    return toErrorResponse(error, "POST /api/credits/request");
  }
}
