import { RULES } from "@/config/rules";
import { fail, ok, type Result } from "./result";
import { addMinutes, minutesBetween, sameSastDay, sastParts } from "./time";

export type ScheduleProblem =
  | "ends_before_start"
  | "too_soon"
  | "outside_daylight"
  | "spans_days"
  | "too_short"
  | "too_long";

export interface TryoutWindow {
  start: Date;
  end: Date;
}

/** Checks a proposed tryout against the notice, daylight and length rules. */
export function validateTryoutWindow(now: Date, window: TryoutWindow): Result<{ hours: number }, ScheduleProblem[]> {
  const problems: ScheduleProblem[] = [];
  const minutes = minutesBetween(window.start, window.end);

  if (minutes <= 0) return fail(["ends_before_start"]);
  if (window.start < addMinutes(now, RULES.minNoticeMinutes)) problems.push("too_soon");
  if (!sameSastDay(window.start, window.end)) problems.push("spans_days");

  const start = sastParts(window.start);
  const end = sastParts(window.end);
  // A start at or after 18:00 is named for what it is, even when it also runs into the next day.
  const startsOutsideDaylight = start.hour < RULES.daylightStartHour || start.hour >= RULES.daylightEndHour;
  const endsAfterDaylight = end.hour > RULES.daylightEndHour || (end.hour === RULES.daylightEndHour && end.minute > 0);
  if (startsOutsideDaylight || endsAfterDaylight) problems.push("outside_daylight");

  const hours = minutes / 60;
  if (hours < RULES.minPaidHours) problems.push("too_short");
  if (hours > RULES.maxTryoutHours) problems.push("too_long");

  return problems.length > 0 ? fail(problems) : ok({ hours });
}

/** Bookings close shortly before the start so nobody books a slot they can't reach. */
export function isBookingOpen(now: Date, start: Date): boolean {
  return now <= addMinutes(start, -RULES.bookingCutoffMinutes);
}

/** True when two tryouts overlap, so one person can't be booked into both. */
export function overlaps(a: TryoutWindow, b: TryoutWindow): boolean {
  return a.start < b.end && b.start < a.end;
}
