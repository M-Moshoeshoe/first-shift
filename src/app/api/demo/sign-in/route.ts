import { NextResponse } from "next/server";
import { RULES } from "@/config/rules";
import { DEMO_MESSAGES } from "@/domain/messages";
import { DemoSignInSchema } from "@/schemas/demo";
import { toErrorResponse } from "@/server/errors";
import { clientAddress, consumeWindowQuota } from "@/server/rateLimit";
import { liveDemoSignInService } from "@/server/services/liveDemoSignInService";
import { parseBody } from "@/server/validate";

/**
 * A demo account's email and password to a sign-in token. There's no signed-in
 * user yet: the password check in the service is the verification step.
 */
export async function POST(request: Request) {
  try {
    // Before anyone is signed in, so counted per network address: one tap and the email form share the count.
    await consumeWindowQuota(`demo_sign_in:${clientAddress(request)}`, RULES.demoSignInsPerWindow, RULES.demoSignInWindowMinutes, DEMO_MESSAGES.tooMany);
    const { email, password } = await parseBody(request, DemoSignInSchema);
    return NextResponse.json(await liveDemoSignInService().signIn(email, password), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "POST /api/demo/sign-in");
  }
}
