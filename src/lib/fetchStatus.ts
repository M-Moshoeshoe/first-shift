import * as z from "zod/mini";
import { BOOKING_STATUSES } from "@/domain/bookingStatus";

const StatusSchema = z.object({ workerFirstName: z.string(), businessName: z.string(), businessArea: z.string(), startAt: z.string(), endAt: z.string(), status: z.enum(BOOKING_STATUSES) });
export type StatusResponse = z.infer<typeof StatusSchema>;

/**
 * The public status page's one request. Plain fetch, never api.ts: this page
 * is for someone with no account, so it must not load sign-in code. Null for
 * any failure, which the page shows as one plain message.
 */
export async function fetchStatus(token: string): Promise<StatusResponse | null> {
  try {
    const response = await fetch(`/api/status/${encodeURIComponent(token)}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return null;
    const parsed = StatusSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
