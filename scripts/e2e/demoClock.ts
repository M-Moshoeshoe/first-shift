import { apiGet, apiPost } from "../../src/lib/api";
import { BookingViewSchema, SkipResultSchema } from "../../src/schemas/booking";

/*
 * The demo clock, checked the way a judge uses it: "Skip to the day" opens a
 * demo booking's door now and keeps the tryout's daytime times (domain/day.ts,
 * demoDayOpen). Used by demo.ts; the rules themselves are tested in
 * tests/unit/day.test.ts.
 */

const view = (bookingId: string) => apiGet(`/api/bookings/${bookingId}`, BookingViewSchema);
const timesOf = (booking: { startAt: string; endAt: string }) => `${booking.startAt} to ${booking.endAt}`;

/** As the young person: tap Skip to the day. The tryout keeps its times, still ahead, and the code is there to show. */
export async function skipToDay(bookingId: string): Promise<{ code: string; times: string }> {
  const before = await view(bookingId);
  const skipped = await apiPost(`/api/bookings/${bookingId}/skip-to-day`, {}, SkipResultSchema);
  const after = await view(bookingId);
  const kept = timesOf(after) === timesOf(before) && Date.parse(after.startAt) > Date.now();
  if (skipped.status !== "skipped" || after.day.canSkipToDay || !after.checkInCode || !kept) {
    throw new Error(`Skip to the day should open the door, keep the tryout's times and leave the code to show: ${JSON.stringify({ skipped, canSkip: after.day.canSkipToDay, before: timesOf(before), after: timesOf(after) })}`);
  }
  return { code: after.checkInCode, times: timesOf(after) };
}

/** As the owner, after Skip to the day: check-in is open now, before the start, at the same times. */
export async function doorOpen(bookingId: string, times: string): Promise<void> {
  const owner = await view(bookingId);
  if (!owner.day.canCheckIn || timesOf(owner) !== times) {
    throw new Error(`The owner should be able to check in now, with the times unchanged: ${JSON.stringify({ canCheckIn: owner.day.canCheckIn, times: timesOf(owner), expected: times })}`);
  }
}
