import { RULES } from "@/config/rules";
import { paidOnTime } from "./paymentFlow";
import { addDays, sastDateKey, sastParts } from "./time";

/*
 * The pilot's numbers (docs/PHASES.md, Pilot), from real records only: the
 * script leaves demo records out before they reach here. Each week runs
 * Monday to Sunday, South African time.
 */

export interface MetricBooking {
  ownerId: string;
  startAt: Date;
  /** When the payment fell due: check-out, or a late cancellation. */
  dueAt: Date | null;
  markedPaidAt: Date | null;
  received: boolean;
}

export interface MetricCase {
  kind: string;
  /** A report's category or a booking review's reason. */
  detail: string;
  openedAt: Date;
  closedAt: Date | null;
}

export interface MetricReference {
  status: string;
  challenged: boolean;
  at: Date;
}

export interface WeekMetrics {
  week: string;
  completedAndPaid: number;
  paidOnTimeRate: string;
  repeatBusinesses: number;
  safetyReports: string;
  safetyHoursToClose: string;
  referencesApproved: string;
  challenges: number;
  hireOffers: number;
  /** Tryout to job: offers the owner marked Hired (hire.ts). */
  hired: number;
}

const SAFETY = new Set(["harassment", "unsafe_work", "asked_for_money", "safety_stop"]);

/** The Monday a day belongs to, as YYYY-MM-DD in South African time. */
export function weekOf(date: Date): string {
  const { year, month, day } = sastParts(date);
  const sastNoon = new Date(Date.UTC(year, month - 1, day, 12 - RULES.timezoneOffsetMinutes / 60));
  const sinceMonday = (sastNoon.getUTCDay() + 6) % 7;
  return sastDateKey(addDays(sastNoon, -sinceMonday));
}

const percent = (part: number, whole: number): string => (whole === 0 ? "none yet" : `${Math.round((part / whole) * 100)}% (${part} of ${whole})`);

function summarise(week: string, bookings: readonly MetricBooking[], cases: readonly MetricCase[], references: readonly MetricReference[], jobs: { offers: number; hired: number }, everCompleted: readonly MetricBooking[]): WeekMetrics {
  const paid = bookings.filter((booking) => booking.received);
  const onTime = paid.filter((booking) => booking.dueAt && booking.markedPaidAt && paidOnTime(booking.dueAt, booking.markedPaidAt));
  const perOwner = new Map<string, number>();
  for (const booking of everCompleted.filter((item) => item.received)) perOwner.set(booking.ownerId, (perOwner.get(booking.ownerId) ?? 0) + 1);
  const safety = cases.filter((item) => SAFETY.has(item.detail));
  const byKind = [...new Set(safety.map((item) => item.detail))].map((kind) => `${kind} ${safety.filter((item) => item.detail === kind).length}`);
  const closed = safety.filter((item) => item.closedAt);
  const hours = closed.map((item) => ((item.closedAt?.getTime() ?? 0) - item.openedAt.getTime()) / 3_600_000);
  const open = safety.length - closed.length;
  return {
    week,
    completedAndPaid: paid.length,
    paidOnTimeRate: percent(onTime.length, paid.length),
    repeatBusinesses: [...perOwner.values()].filter((count) => count >= 2).length,
    safetyReports: safety.length === 0 ? "0" : `${safety.length}: ${byKind.join(", ")}`,
    safetyHoursToClose: closed.length === 0 ? (open > 0 ? `${open} still open` : "none") : `longest ${Math.max(...hours).toFixed(1)} h${open > 0 ? `, ${open} still open` : ""}`,
    referencesApproved: percent(references.filter((reference) => reference.status === "approved").length, references.length),
    challenges: references.filter((reference) => reference.challenged).length,
    hireOffers: jobs.offers,
    hired: jobs.hired,
  };
}

/** One row per week that had any activity, oldest first, then the totals. Repeat businesses count every week up to and including that one. */
export function pilotMetrics(input: { bookings: readonly MetricBooking[]; cases: readonly MetricCase[]; references: readonly MetricReference[]; hireOffers: readonly Date[]; hires?: readonly Date[] }): WeekMetrics[] {
  const hires = input.hires ?? [];
  const weeks = [...new Set([...input.bookings.map((item) => weekOf(item.startAt)), ...input.cases.map((item) => weekOf(item.openedAt)), ...input.references.map((item) => weekOf(item.at)), ...input.hireOffers.map(weekOf), ...hires.map(weekOf)])].sort();
  const rows = weeks.map((week) =>
    summarise(
      week,
      input.bookings.filter((item) => weekOf(item.startAt) === week),
      input.cases.filter((item) => weekOf(item.openedAt) === week),
      input.references.filter((item) => weekOf(item.at) === week),
      { offers: input.hireOffers.filter((at) => weekOf(at) === week).length, hired: hires.filter((at) => weekOf(at) === week).length },
      input.bookings.filter((item) => weekOf(item.startAt) <= week),
    ),
  );
  return [...rows, summarise("total", input.bookings, input.cases, input.references, { offers: input.hireOffers.length, hired: hires.length }, input.bookings)];
}
