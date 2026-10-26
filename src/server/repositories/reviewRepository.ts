import type { BookingRecord } from "@/domain/bookings";
import type { Party } from "@/domain/cancellation";
import type { ReviewCase } from "@/domain/cases";
import type { StrikeReason } from "@/domain/strikes";
import type { Planned } from "./offerRepository";

export interface OpenCase {
  id: string;
  item: ReviewCase;
  openedAt: Date;
  demo: boolean;
}

/** Everything a person needs to decide a case, read for the admin only. Raw records: this never leaves the admin's terminal. */
export interface CaseContext extends OpenCase {
  bookingId: string | null;
  booking: BookingRecord | null;
  parties: { businessId: string; workerId: string | null };
  users: Record<string, Record<string, unknown>>;
  businesses: Record<string, Record<string, unknown>>;
  reference: Record<string, unknown> | null;
  evidence: Record<string, unknown>[];
  /** Earlier cases about either party, newest first. */
  history: { id: string; kind: string; detail: string; status: string; openedAt: Date }[];
  strikes: { id: string; uid: string; reason: string; overturned: boolean; at: Date }[];
}

/** What a resolution writes, each piece audit-logged with the admin and the reasoning. */
export interface ResolveWrite {
  outcome: string;
  reason: string;
  admin: string;
  status: { uid: string; party: Party; to: "active" | "paused" }[];
  strikes: { uid: string; party: Party; reason: StrikeReason }[];
  overturn: string[];
  reference: { id: string; status: "withdrawn" | "draft" } | null;
}

/** Review cases for admins (npm run review:case). Firestore in production; fakes in tests. */
export interface ReviewRepository {
  open(): Promise<OpenCase[]>;
  context(caseId: string): Promise<CaseContext | null>;
  /** One transaction: the case read again, and if the plan resolves it, every change, the case closed, and the audit entries. */
  transactResolve<R>(caseId: string, plan: Planned<CaseContext | null, ResolveWrite, R>): Promise<R>;
}
