import { NextResponse } from "next/server";
import { DemoSignInSchema } from "@/schemas/demo";
import { toErrorResponse } from "@/server/errors";
import { liveDemoSignInService } from "@/server/services/liveDemoSignInService";
import { parseBody } from "@/server/validate";

/**
 * A demo account's email and password to a sign-in token. There's no signed-in
 * user yet: the password check in the service is the verification step.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await parseBody(request, DemoSignInSchema);
    return NextResponse.json(await liveDemoSignInService().signIn(email, password), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error, "POST /api/demo/sign-in");
  }
}
