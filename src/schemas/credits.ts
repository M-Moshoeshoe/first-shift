import * as z from "zod/mini";

// Zod's small build: the Credits screen reads these in the browser.

/** GET /api/credits: the balance, the history in plain words (newest first) and any request still open. */
export const CreditsViewSchema = z.object({
  available: z.number(),
  held: z.number(),
  freeLeft: z.number(),
  history: z.array(z.object({ at: z.string(), text: z.string() })),
  request: z.nullable(z.object({ requestedAt: z.string() })),
});
export type CreditsViewResponse = z.infer<typeof CreditsViewSchema>;

/** POST /api/credits/request: asking twice keeps the first request. */
export const CreditRequestResultSchema = z.object({ status: z.enum(["requested", "unchanged"]), requestedAt: z.string() });
export type CreditRequestResult = z.infer<typeof CreditRequestResultSchema>;
