import * as z from "zod/mini";
import { FINDING_MESSAGES } from "@/domain/findingMessages";
import { RULES } from "@/config/rules";
import { TryoutIdSchema } from "./tryout";

// Zod's small build: the feed and the detail page read these in the browser (docs/DESIGN.md, Performance).

/** One slip (domain/nearby.ts, FeedItem). Times are ISO strings on the wire. */
export const FeedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  businessName: z.string(),
  area: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  hours: z.number(),
  rateCentsPerHour: z.number(),
  payCents: z.number(),
  returnFareCents: z.nullable(z.number()),
  distance: z.nullable(z.string()),
  km: z.nullable(z.number()),
  injuryCover: z.string(),
  payRecord: z.string(),
  // Optional, so a page from a new deploy still reads a reply from the previous one for the minute both are live.
  photoSubject: z.optional(z.string()),
});
export type FeedItemResponse = z.infer<typeof FeedItemSchema>;

/** GET /api/tryouts/nearby: the feed, or why there isn't one. */
export const NearbySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), area: z.string(), items: z.array(FeedItemSchema) }),
  z.object({ status: z.literal("unknown_area"), area: z.string() }),
]);
export type NearbyResponse = z.infer<typeof NearbySchema>;

const ApplyStateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("can_apply") }),
  z.object({ kind: z.literal("applied") }),
  z.object({ kind: z.literal("offered"), lapsesAt: z.string() }),
  z.object({ kind: z.literal("booked"), bookingId: z.string() }),
  z.object({ kind: z.literal("not_selected") }),
  z.object({ kind: z.literal("closed"), reason: z.enum(["booking_closed", "not_open", "example_only"]) }),
  z.object({ kind: z.literal("not_eligible"), reason: z.enum(["not_young_person", "profile_incomplete", "profile_update", "account_paused", "overlaps_booking"]) }),
]);
export type ApplyStateResponse = z.infer<typeof ApplyStateSchema>;

/** GET /api/tryouts/[id]: the slip, the tasks, and what this young person can do. */
export const TryoutDetailSchema = z.object({ item: FeedItemSchema, tasks: z.array(z.string()), state: ApplyStateSchema });
export type TryoutDetailResponse = z.infer<typeof TryoutDetailSchema>;

/** POST /api/applications. */
export const ApplySchema = z.object({
  tryoutId: TryoutIdSchema,
  note: z.optional(z.string({ error: FINDING_MESSAGES.note }).check(z.trim(), z.maxLength(RULES.applicationNoteMaxChars, FINDING_MESSAGES.note))),
});

/** POST /api/applications and its withdraw route: the new state, so the page shows it at once. */
export const ApplicationResultSchema = z.object({ status: z.enum(["applied", "withdrawn", "unchanged"]), state: ApplyStateSchema });
export type ApplicationResult = z.infer<typeof ApplicationResultSchema>;
