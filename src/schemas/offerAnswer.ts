import * as z from "zod/mini";

// Its own module, so the tryout page loads none of the booking schemas and the domain code behind them (docs/DESIGN.md, Performance).

/** POST /api/applications/[tryoutId]/answer: accepting books it, declining frees the place. */
export const AnswerResultSchema = z.object({ status: z.enum(["booked", "declined", "unchanged"]) });
