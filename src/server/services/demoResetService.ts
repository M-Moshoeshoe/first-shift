import "server-only";
import { RULES } from "@/config/rules";
import { DEMO_COPY } from "@/domain/demoCopy";
import type { Viewer } from "@/domain/demo";
import { AppError } from "../errors";
import { log } from "../log";

export interface DemoResetDeps {
  /** Puts the whole demo world back to its known state (repositories/firestoreDemoWorld.ts). */
  reset: (now: Date) => Promise<unknown>;
  /** Refuses with a 429 if the demo was reset less than the cooldown ago, by anyone. */
  claimCooldown: (key: string, seconds: number, message: string, now: Date) => Promise<void>;
  now: () => Date;
}

/**
 * "Reset the demo": only a demo account may ask, and only once a minute for
 * everyone, because the demo world is shared by every judge using it. It
 * touches demo records only, the same reset as npm run demo:reset.
 */
export function createDemoResetService({ reset, claimCooldown, now }: DemoResetDeps) {
  return {
    async reset(viewer: Viewer): Promise<{ status: "reset" }> {
      if (!viewer.demo) {
        log("warn", "demo_reset_refused", { reason: "not_demo" });
        throw new AppError(403, "not_demo", DEMO_COPY.notDemo);
      }
      const at = now();
      await claimCooldown("demo_reset", RULES.demoResetCooldownSeconds, DEMO_COPY.resetTooSoon, at);
      await reset(at);
      log("info", "demo_reset", {});
      return { status: "reset" };
    },
  };
}

export type DemoResetService = ReturnType<typeof createDemoResetService>;
