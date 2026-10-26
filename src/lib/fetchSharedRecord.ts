import { SharedRecordSchema, type SharedRecordResponse } from "@/schemas/sharedRecord";

/**
 * The shared record page's one request. Plain fetch, never api.ts: whoever
 * opens a shared record has no account, so the page must not load sign-in
 * code. Null for any failure, which the page shows as one plain message.
 */
export async function fetchSharedRecord(token: string): Promise<SharedRecordResponse | null> {
  try {
    const response = await fetch(`/api/record/${encodeURIComponent(token)}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return null;
    const parsed = SharedRecordSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
