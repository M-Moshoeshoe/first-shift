import type { ApplicationStatus } from "@/domain/applications";
import type { BookingRecord } from "@/domain/bookings";
import type { Party } from "@/domain/cancellation";
import type { ReviewCase } from "@/domain/cases";
import type { CreditEntry } from "@/domain/credits";
import type { StrikeReason } from "@/domain/strikes";
import type { TryoutStatus } from "@/domain/tryout";
import type { BookingSecrets, Planned } from "./offerRepository";

export interface BookingState {
  booking: BookingRecord | null;
  secrets: BookingSecrets | null;
  ownerLedger: CreditEntry[];
  /** What the business is paused for, if it is (day.ts, unpaidPause). */
  businessPausedFor: string | null;
}

export type Counter = "completed" | "onTime" | "noShows";

/** What one step of a booking writes (cancel, check-in, no-show, check-out, Paid, Received), all in one transaction with its audit entry. */
export interface BookingWrite {
  booking?: Partial<BookingRecord>;
  /** One more wrong check-in code. */
  codeAttempt?: boolean;
  tryoutStatus?: TryoutStatus;
  applicationStatus?: ApplicationStatus;
  ledger?: CreditEntry[];
  strike?: { party: Party; reason: StrikeReason } | null;
  review?: ReviewCase | null;
  business?: { status: "active" | "paused"; pausedFor: string | null };
  counters?: { worker?: Counter[]; business?: Counter[] };
  audit: string;
}

/** Bookings, their secrets, endings and reports. Firestore in production; fakes in tests. */
export interface BookingRepository {
  get(bookingId: string): Promise<{ booking: BookingRecord; secrets: BookingSecrets } | null>;
  /** Free cancellations by this person since the given time that were free only because of the grace period. */
  graceCancelsSince(uid: string, since: Date): Promise<number>;
  transactBooking<R>(bookingId: string, actorUid: string, plan: Planned<BookingState, BookingWrite, R>): Promise<R>;
  /** The bookings this person is a party to that still have money moving: for the payment deadlines. */
  awaitingPayment(uid: string): Promise<{ id: string; booking: BookingRecord }[]>;
  /** Saves a report as a review case, and pauses the business if it must be paused, with audit entries. */
  report(reviewCase: ReviewCase, reporterUid: string, pauseBusiness: boolean): Promise<string>;
  byShareToken(token: string): Promise<BookingRecord | null>;
  /** How two people are linked, for photo permissions: an application from subject to viewer, or a booking between them. */
  relation(viewerUid: string, subjectUid: string): Promise<{ appliedToViewer: boolean; bookedTogether: boolean }>;
}
