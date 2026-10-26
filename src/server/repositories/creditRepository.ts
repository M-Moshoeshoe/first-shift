import type { CreditEntry } from "@/domain/credits";
import type { Planned } from "./offerRepository";

export interface CreditRequestRecord {
  id: string;
  at: Date;
}

export interface CreditState {
  isBusiness: boolean;
  demo: boolean;
  ledger: CreditEntry[];
  /** Requests for more credits still open: at most one, by the request rule. */
  open: CreditRequestRecord[];
}

/** An admin's grant: the entries, the requests it answers, and who did it and why, for the audit log. */
export interface GrantWrite {
  entries: CreditEntry[];
  close: string[];
  admin: string;
  reason: string;
}

/** The credit ledger as a business sees it, and requests for more. Firestore in production; fakes in tests. */
export interface CreditRepository {
  /** The ledger with each entry's time, every request this business made, and the titles of the tryouts in the ledger. */
  history(businessId: string): Promise<{ state: CreditState; entries: { entry: CreditEntry; at: Date }[]; requests: Date[]; titles: Map<string, string> }>;
  /** One transaction: a new request is a review case (kind credit_request) with its audit entry. */
  transactRequest<R>(businessId: string, plan: Planned<CreditState, { at: Date }, R>): Promise<R>;
  /** One transaction: the grant's ledger entries, each audited, the requests it closes, and one audit entry with the admin and the reason. */
  transactGrant<R>(businessId: string, plan: Planned<CreditState, GrantWrite, R>): Promise<R>;
}
