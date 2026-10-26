import { NextResponse } from "next/server";
import { RULES } from "@/config/rules";
import { DEMO_MESSAGES } from "@/domain/messages";
import { DemoTrySchema } from "@/schemas/demo";
import { toErrorResponse } from "@/server/errors";
import { clientAddress, consumeWindowQuota } from "@/server/rateLimit";
import { liveDemoSignInService } from "@/server/services/liveDemoSignInService";
import { parseBody } from "@/server/validate";

/**
 * "Try as Thabo" or "Try as Sipho": a demo role to a sign-in token, in one tap.
 * There's no signed-in user yet and no password to check: the demo accounts
 * are public by design, and demo isolation keeps them apart from real people.
 */
export async function POST(request: Request) {
  try {
    // Before anyone is signed in, so counted per network address: one tap and the email form share the count.
    await consumeWindowQuota(`demo_sign_in:${clientAddress(request)}`, RULES.demoSignInsPerWindow, RULES.demoSignInWindowMinutes, DEMO_MESSAGES.tooMany);
    const { role } = await parseBody(request, DemoTrySchema);
    return NextResponse.json(await liveDemoSignInService().tryAs(role), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "POST /api/demo/try");
  }
}
