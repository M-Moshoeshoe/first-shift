import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveDemoResetService } from "@/server/services/liveDemoResetService";

/** "Reset the demo": demo accounts only, once a minute for everyone. Puts the shared demo world back to the start. */
export async function POST(request: Request) {
  try {
    const viewer = await requireUser(request);
    return NextResponse.json(await liveDemoResetService().reset(viewer), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "POST /api/demo/reset");
  }
}
