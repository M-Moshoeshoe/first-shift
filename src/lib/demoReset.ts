import { DEMO_COPY } from "@/domain/demoCopy";
import { fail, ok, type Result } from "@/domain/result";
import { ApiError, apiPost } from "@/lib/api";
import { DemoResetSchema } from "@/schemas/demoReset";

/** "Reset the demo": loaded only when tapped, so the demo bar adds almost nothing to every account page. */
export async function resetDemo(): Promise<Result<true, string>> {
  try {
    await apiPost("/api/demo/reset", {}, DemoResetSchema);
    return ok(true);
  } catch (error) {
    return fail(error instanceof ApiError ? error.message : DEMO_COPY.resetFailed);
  }
}
