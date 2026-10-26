import type { HireAnswer, HireOfferRecord, HireOutcome } from "@/domain/hire";
import type { WorkedSlot } from "@/domain/regularEmployment";
import type { Planned } from "./offerRepository";

/** One change to an offer: the young person's answer or the owner's outcome, with its audit entry. */
export type HireWrite = { answer: HireAnswer; audit: string } | { outcome: HireOutcome; audit: string };

/** Job offers between a business and a young person who've worked together. Firestore in production; fakes in tests. */
export interface HireRepository {
  /** What the pair has done together: completed tryouts, the booked and completed slots for the 24-hour line, and the offer if one was made. */
  pair(ownerId: string, workerId: string): Promise<{ completed: number; slots: WorkedSlot[]; offer: HireOfferRecord | null }>;
  /** Records the offer once per pair (hireOffers/{ownerId}_{workerId}) with its audit entry. */
  create(offer: HireOfferRecord, actorUid: string): Promise<"created" | "exists">;
  /** One transaction on one offer: read it, decide, write the change and its audit entry. */
  transact<R>(offerId: string, actorUid: string, plan: Planned<HireOfferRecord | null, HireWrite, R>): Promise<R>;
  /** The offers a young person has had, newest first, each with its id, for Applications and the work record. */
  forWorker(workerId: string): Promise<(HireOfferRecord & { id: string })[]>;
}
