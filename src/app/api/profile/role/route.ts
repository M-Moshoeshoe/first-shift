import { NextResponse } from "next/server";
import { RoleSchema } from "@/schemas/profile";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { liveProfileService } from "@/server/services/liveProfileService";
import { parseBody } from "@/server/validate";

/** Sets the account's role, once. Asking again for the same role changes nothing. */
export async function POST(request: Request) {
  try {
    const { uid } = await requireUser(request);
    const { role } = await parseBody(request, RoleSchema);
    return NextResponse.json(await liveProfileService().setRole(uid, role));
  } catch (error) {
    return toErrorResponse(error, "POST /api/profile/role");
  }
}
