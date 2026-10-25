import { RULES } from "@/config/rules";
import { fail, ok, type Result } from "./result";
import type { TryoutWindow } from "./schedule";
import { addMinutes, fromSast } from "./time";

export const TRYOUT_STATUSES = ["review", "published", "booked", "completed", "withdrawn"] as const;
export type TryoutStatus = (typeof TRYOUT_STATUSES)[number];

export const TRYOUT_ACTIONS = ["approve", "reject", "withdraw", "book", "complete", "cancel"] as const;
export type TryoutAction = (typeof TRYOUT_ACTIONS)[number];

/**
 * Every move a tryout can make. A review tryout goes live only when approved,
 * or is taken down when rejected; a tryout can be withdrawn only while nobody
 * is booked on it. Anything not listed is refused.
 */
const MOVES: Record<TryoutStatus, Partial<Record<TryoutAction, TryoutStatus>>> = {
  review: { approve: "published", reject: "withdrawn", withdraw: "withdrawn" },
  published: { book: "booked", withdraw: "withdrawn" },
  // A cancelled booking ends the tryout; the owner posts again if they still need someone.
  booked: { complete: "completed", cancel: "withdrawn" },
  completed: {},
  withdrawn: {},
};

export function transition(status: TryoutStatus, action: TryoutAction): Result<TryoutStatus, "not_allowed"> {
  const next = MOVES[status][action];
  return next ? ok(next) : fail("not_allowed");
}

export type WindowInputProblem = "invalid_date" | "invalid_time" | "invalid_hours";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseDate(date: string): { year: number; month: number; day: number } | null {
  const match = DATE_PATTERN.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Date.UTC rolls 30 February over into March; a real date survives the round trip.
  const check = new Date(Date.UTC(year, month - 1, day));
  const real = check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  return real ? { year, month, day } : null;
}

/**
 * The UTC start and end of a tryout from what the owner picked: a South
 * African date ("YYYY-MM-DD"), start time ("HH:MM") and length in hours.
 * It only builds the window; validateTryoutWindow checks it against the rules.
 */
export function buildTryoutWindow(date: string, startTime: string, hours: number): Result<TryoutWindow, WindowInputProblem> {
  const day = parseDate(date);
  if (!day) return fail("invalid_date");
  const time = TIME_PATTERN.exec(startTime);
  if (!time) return fail("invalid_time");
  if (!Number.isFinite(hours) || hours <= 0) return fail("invalid_hours");

  const start = fromSast(day.year, day.month, day.day, Number(time[1]), Number(time[2]));
  return ok({ start, end: addMinutes(start, hours * 60) });
}

/** The AI's suggested length, rounded to whole hours and kept within 4 to 8. Only a starting point: the owner chooses. */
export function suggestHours(aiHours: number): number {
  if (!Number.isFinite(aiHours)) return RULES.minPaidHours;
  return Math.min(RULES.maxTryoutHours, Math.max(RULES.minPaidHours, Math.round(aiHours)));
}

/**
 * The one text the safety check sees. The draft step sends the request alone
 * and publishing sends the final title and tasks with it, both built here so
 * the two checks can't drift apart. Blank parts are left out.
 */
export function checkText(title: string, tasks: readonly string[], description: string): string {
  const parts: string[] = [];
  const cleanTitle = title.trim();
  const cleanTasks = tasks.map((task) => task.trim()).filter((task) => task.length > 0);
  const cleanDescription = description.trim();

  if (cleanTitle) parts.push(`Title: ${cleanTitle}`);
  if (cleanTasks.length > 0) parts.push(["Tasks:", ...cleanTasks.map((task) => `- ${task}`)].join("\n"));
  if (cleanDescription) parts.push(`Request: ${cleanDescription}`);
  return parts.join("\n");
}
