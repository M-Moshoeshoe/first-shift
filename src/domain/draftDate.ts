import { addDays, sastDateKey, sastParts } from "./time";

/*
 * The date on a drafted tryout. The model is told today's date and may give
 * one, but code decides: a day the owner named ("today", "tomorrow", or a
 * weekday) sets the date, and a model date that disagrees is ignored. If no
 * day is named, the date is left empty for the owner to choose, so a tryout
 * titled "Saturday helper" can't quietly land on a Tuesday.
 */
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const DAY_WORD = /\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b/i;

/** Today in South Africa, as the model is told it: "Monday 26 October 2026 (2026-10-26)". */
export function todayForPrompt(now: Date): string {
  const { year, month, day } = sastParts(now);
  const weekday = WEEKDAYS[sastWeekday(now)] ?? "";
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} ${MONTHS[month - 1] ?? ""} ${year} (${sastDateKey(now)})`;
}

const sastWeekday = (now: Date): number => {
  const { year, month, day } = sastParts(now);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

/** The draft's date: the first day the request names, as a South African date, "YYYY-MM-DD": today, tomorrow, or the next such weekday (today if it's today). Null if none. */
export function namedDate(description: string, now: Date): string | null {
  const word = DAY_WORD.exec(description)?.[1]?.toLowerCase();
  if (!word) return null;
  if (word === "today") return sastDateKey(now);
  if (word === "tomorrow") return sastDateKey(addDays(now, 1));
  const target = WEEKDAYS.indexOf(word as (typeof WEEKDAYS)[number]);
  return sastDateKey(addDays(now, (target - sastWeekday(now) + 7) % 7));
}
