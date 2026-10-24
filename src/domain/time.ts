import { RULES } from "@/config/rules";

const MINUTE_MS = 60_000;

export const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * MINUTE_MS);
export const addHours = (date: Date, hours: number): Date => addMinutes(date, hours * 60);
export const addDays = (date: Date, days: number): Date => addHours(date, days * 24);
export const minutesBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / MINUTE_MS;

/** Local South African wall-clock parts for a UTC instant. */
export function sastParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const local = addMinutes(date, RULES.timezoneOffsetMinutes);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

/** The UTC instant of a South African wall-clock time. Month is 1 to 12. */
export function fromSast(year: number, month: number, day: number, hour: number, minute: number): Date {
  return addMinutes(new Date(Date.UTC(year, month - 1, day, hour, minute)), -RULES.timezoneOffsetMinutes);
}

/** The UTC instant of a South African wall-clock time on the same SAST day as date. */
export function atSastTime(date: Date, hour: number, minute: number): Date {
  const { year, month, day } = sastParts(date);
  return fromSast(year, month, day, hour, minute);
}

/** The South African calendar date of an instant, "YYYY-MM-DD", for anything counted per day. */
export function sastDateKey(date: Date): string {
  const { year, month, day } = sastParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function sameSastDay(a: Date, b: Date): boolean {
  const x = sastParts(a);
  const y = sastParts(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}
