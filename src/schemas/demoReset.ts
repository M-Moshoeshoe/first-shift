import * as z from "zod/mini";

// Its own module, so the demo bar on every account screen loads no messages with it (docs/DESIGN.md, Performance).

/** POST /api/demo/reset: the demo is back at the start. */
export const DemoResetSchema = z.object({ status: z.literal("reset") });
