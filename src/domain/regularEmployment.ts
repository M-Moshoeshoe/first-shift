import { RULES } from "@/config/rules";
import { sastParts } from "./time";

/** A booked or completed tryout between one business and one young person. */
export interface WorkedSlot {
  startAt: Date;
  hours: number;
}

const sameSastMonth = (a: Date, b: Date): boolean => {
  const x = sastParts(a);
  const y = sastParts(b);
  return x.year === y.year && x.month === y.month;
};

/** Hours already booked or worked with this business in the South African calendar month of at. */
export function hoursInSastMonth(slots: readonly WorkedSlot[], at: Date): number {
  return slots.filter((slot) => sameSastMonth(slot.startAt, at)).reduce((sum, slot) => sum + slot.hours, 0);
}

/**
 * The 24-hour line (docs/COMPLIANCE.md): under 24 hours a month with the same
 * employer, UIF and the BCEA's working-time and leave chapters don't apply; at
 * 24 or more they do in full. A booking that would bring the same business and
 * young person to the line in one calendar month (SAST) is refused, and the
 * owner is asked to offer a job instead. existing holds only their booked and
 * completed tryouts, never cancelled ones.
 */
export function crossesRegularEmploymentLine(existing: readonly WorkedSlot[], candidate: WorkedSlot): boolean {
  return hoursInSastMonth(existing, candidate.startAt) + candidate.hours >= RULES.regularEmploymentHoursPerMonth;
}
