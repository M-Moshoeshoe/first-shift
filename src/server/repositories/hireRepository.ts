import type { HireOfferRecord } from "@/domain/hire";
import type { WorkedSlot } from "@/domain/regularEmployment";

/** Job offers between a business and a young person who've worked together. Firestore in production; fakes in tests. */
export interface HireRepository {
  /** What the pair has done together: completed tryouts, the booked and completed slots for the 24-hour line, and whether an offer was made. */
  pair(ownerId: string, workerId: string): Promise<{ completed: number; slots: WorkedSlot[]; offered: boolean }>;
  /** Records the offer once per pair (hireOffers/{ownerId}_{workerId}) with its audit entry. */
  create(offer: HireOfferRecord, actorUid: string): Promise<"created" | "exists">;
  /** The offers a young person has had, newest first, for Applications. */
  forWorker(workerId: string): Promise<HireOfferRecord[]>;
}
