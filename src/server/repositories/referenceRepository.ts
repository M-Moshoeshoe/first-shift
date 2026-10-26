import type { BookingRecord } from "@/domain/bookings";
import type { ReviewCase } from "@/domain/cases";
import type { ReferenceRecord, ReferenceStatus } from "@/domain/references";
import type { Planned } from "./offerRepository";

/** What a decision on a reference writes: its new status, and for a challenge the review case, with the audit entry. */
export interface ReferenceWrite {
  status: ReferenceStatus;
  review?: ReviewCase;
  audit: string;
}

/** References (references/{bookingId}), the work record and its share link. Firestore in production; fakes in tests. */
export interface ReferenceRepository {
  /** The booking, its reference if written, and the tryout's tasks it's written from. */
  forBooking(bookingId: string): Promise<{ booking: BookingRecord | null; reference: ReferenceRecord | null; tasks: string[] }>;
  /** Stores the reference once, with its audit entry; a second writer gets the one already stored. */
  create(bookingId: string, reference: ReferenceRecord, actorUid: string): Promise<ReferenceRecord>;
  transactDecide<R>(referenceId: string, actorUid: string, plan: Planned<ReferenceRecord | null, ReferenceWrite, R>): Promise<R>;
  /** Everything the young person's record is built from: their first name, their bookings and their references. */
  workerRecord(workerId: string): Promise<{ firstName: string; bookings: { id: string; booking: BookingRecord }[]; references: Map<string, ReferenceRecord> }>;
  /** The record's share token: the one already set, or this new one, set once. */
  shareToken(workerId: string, fresh: string): Promise<string>;
  /** Whose record a share token opens; null for an unknown token. */
  byShareToken(token: string): Promise<string | null>;
}
