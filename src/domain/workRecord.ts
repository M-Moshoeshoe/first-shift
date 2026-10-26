import type { BookingRecord } from "./bookings";
import type { OwnerAnswers, ReferenceRecord, ReferenceStatus } from "./references";
import { sastDay } from "./time";

/*
 * The work record: every tryout that ended with Received is a verified line,
 * whether or not it has a reference, because both sides confirmed it. A
 * reference shows only once the young person approved it, and the shared
 * record shows only approved content: never an ID, a phone number or a surname.
 */

export interface RecordEntry {
  bookingId: string;
  businessName: string;
  businessArea: string;
  title: string;
  day: string;
  hours: number;
  /** The young person's own view sees every status; the shared record only approved ones. */
  reference: { text: string; answers: OwnerAnswers; status: ReferenceStatus } | null;
}

const QUARTER_HOUR = 15;

/** Hours to show: the agreed hours when the day was paid in full; the hours worked when it ended early by the young person's choice or for safety. */
export function recordHours(booking: Pick<BookingRecord, "hours" | "ended">): number {
  const ended = booking.ended;
  if (!ended || (ended.reason !== "worker_left_early" && ended.reason !== "safety")) return booking.hours;
  return Math.max(QUARTER_HOUR, Math.round(ended.minutesWorked / QUARTER_HOUR) * QUARTER_HOUR) / 60;
}

/** The young person's record, newest first: one verified entry per tryout paid and confirmed by both. */
export function recordEntries(bookings: readonly { id: string; booking: BookingRecord }[], references: ReadonlyMap<string, ReferenceRecord>): RecordEntry[] {
  return bookings
    .filter(({ booking }) => booking.payment?.state === "received")
    .sort((a, b) => b.booking.startAt.getTime() - a.booking.startAt.getTime())
    .map(({ id, booking }) => {
      const reference = references.get(id);
      return {
        bookingId: id,
        businessName: booking.businessName,
        businessArea: booking.businessArea,
        title: booking.title,
        day: sastDay(booking.startAt),
        hours: recordHours(booking),
        reference: reference && reference.status !== "withdrawn" ? { text: reference.text, answers: reference.answers, status: reference.status } : null,
      };
    });
}

export interface SharedRecord {
  firstName: string;
  /** "Offered a job by", and "Hired by" once marked (hire.ts, recordJobs). */
  jobs: { businessName: string; hired: boolean }[];
  entries: (Omit<RecordEntry, "bookingId" | "reference"> & { reference: { text: string; answers: OwnerAnswers } | null })[];
}

/** What the share link shows: the first name and the verified entries, with approved references only. */
export function sharedRecord(firstName: string, entries: readonly RecordEntry[], jobs: readonly { businessName: string; hired: boolean }[] = []): SharedRecord {
  return {
    firstName,
    jobs: [...jobs],
    entries: entries.map((entry) => ({
      businessName: entry.businessName,
      businessArea: entry.businessArea,
      title: entry.title,
      day: entry.day,
      hours: entry.hours,
      reference: entry.reference?.status === "approved" ? { text: entry.reference.text, answers: entry.reference.answers } : null,
    })),
  };
}

/** Share links are 144 random bits, as base64url: 24 characters nobody can guess. */
export const isRecordToken = (token: string): boolean => /^[A-Za-z0-9_-]{24}$/.test(token);
