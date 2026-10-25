import type { ApplicationRecord } from "@/domain/applications";
import type { BookingRecord } from "@/domain/bookings";
import type { CreditEntry } from "@/domain/credits";
import type { BusinessRecord, UserRecord } from "@/domain/profile";
import type { WorkedSlot } from "@/domain/regularEmployment";
import type { TryoutWindow } from "@/domain/schedule";
import type { TryoutRecord } from "@/domain/tryoutDecisions";

/** Server-only: the check-in code the young person shows at the door, and the share token behind the public status page. */
export interface BookingSecrets {
  checkInCode: string;
  shareToken: string;
  expiresAt: Date;
}

export interface OfferState {
  tryout: TryoutRecord | null;
  application: ApplicationRecord | null;
}

/** Everything accepting an offer is decided on, read in one transaction. */
export interface AnswerState extends OfferState {
  ownerLedger: CreditEntry[];
  workerBookings: TryoutWindow[];
  pairSlots: WorkedSlot[];
  business: BusinessRecord | null;
  worker: UserRecord | null;
  /** The young person's other applications, for withdrawing the ones that overlap. */
  workerApplications: ApplicationRecord[];
  /** Everyone else who applied to this tryout, who becomes "not selected". */
  tryoutApplications: ApplicationRecord[];
  /** The id an accepted offer's booking will have. */
  newBookingId: string;
}

export type AnswerWrite =
  | { kind: "decline" }
  | { kind: "accept"; booking: BookingRecord; secrets: BookingSecrets; hold: CreditEntry[]; withdraw: ApplicationRecord[]; notSelected: ApplicationRecord[] };

export interface Planned<S, W, R> {
  (state: S): { write: W | null; result: R };
}

/** Offers, answers and the lists around them. Firestore in production; fakes in tests. */
export interface OfferRepository {
  tryout(tryoutId: string): Promise<TryoutRecord | null>;
  /** Everyone who applied to this tryout, with their user record and approved reference count. */
  applicants(tryoutId: string): Promise<{ application: ApplicationRecord; worker: UserRecord; approvedReferences: number }[]>;
  /** The owner has seen this tryout's applicants: they stop counting towards the badge. */
  markSeen(tryoutId: string, ownerId: string): Promise<void>;
  /** One transaction: the tryout and this applicant's application; an offer writes both, with its audit entry. */
  transactOffer<R>(tryoutId: string, workerId: string, plan: Planned<OfferState, { at: Date }, R>): Promise<R>;
  /**
   * One transaction: everything in AnswerState; a decline or an accept writes
   * all its changes together (the booking and its secrets, the tryout, every
   * application it touches, the credit hold) with their audit entries.
   */
  transactAnswer<R>(tryoutId: string, workerId: string, plan: Planned<AnswerState, AnswerWrite, R>): Promise<R>;
  /** The young person's applications, newest tryout first, each with its tryout. */
  workerApplications(workerId: string): Promise<{ application: ApplicationRecord; tryout: TryoutRecord | null }[]>;
  /** Applications the owner hasn't seen yet, and offers waiting for this young person. */
  badgeInputs(uid: string, role: "business" | "young_person"): Promise<ApplicationRecord[]>;
}
