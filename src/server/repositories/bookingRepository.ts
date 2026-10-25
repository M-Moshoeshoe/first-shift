import type { BookingRecord } from "@/domain/bookings";
import type { Party } from "@/domain/cancellation";
import type { ReviewCase } from "@/domain/cases";
import type { CreditEntry } from "@/domain/credits";
import type { StrikeReason } from "@/domain/strikes";
import type { BookingSecrets, Planned } from "./offerRepository";

export interface BookingState {
  booking: BookingRecord | null;
  ownerLedger: CreditEntry[];
}

/** What a cancellation (or, in Phase 5, any ending) writes, all in one transaction with its audit entries. */
export interface EndingWrite {
  booking: Partial<BookingRecord>;
  /** The tryout's new status. */
  tryoutStatus: "withdrawn" | "completed";
  /** The young person's application, after this ending. */
  applicationStatus: "cancelled" | "withdrawn" | "booked";
  ledger: CreditEntry[];
  strike: { party: Party; reason: StrikeReason } | null;
  audit: string;
}

/** Bookings, their secrets, endings and reports. Firestore in production; fakes in tests. */
export interface BookingRepository {
  get(bookingId: string): Promise<{ booking: BookingRecord; secrets: BookingSecrets } | null>;
  /** Free cancellations by this person since the given time that were free only because of the grace period. */
  graceCancelsSince(uid: string, since: Date): Promise<number>;
  transactEnding<R>(bookingId: string, actorUid: string, plan: Planned<BookingState, EndingWrite, R>): Promise<R>;
  /** Saves a report as a review case, and pauses the business if it must be paused, with audit entries. */
  report(reviewCase: ReviewCase, reporterUid: string, pauseBusiness: boolean): Promise<string>;
  byShareToken(token: string): Promise<BookingRecord | null>;
  /** How two people are linked, for photo permissions: an application from subject to viewer, or a booking between them. */
  relation(viewerUid: string, subjectUid: string): Promise<{ appliedToViewer: boolean; bookedTogether: boolean }>;
}
