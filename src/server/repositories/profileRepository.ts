import type { CreditEntry } from "@/domain/credits";
import type { BusinessRecord, UserRecord } from "@/domain/profile";

export type AuditAction = "role_set" | "worker_profile_saved" | "worker_profile_edited" | "business_profile_saved" | "owner_details_saved" | "photo_saved";

/** Everything a profile decision needs about one account, read inside the transaction. */
export interface StoredProfile {
  user: UserRecord | null;
  business: BusinessRecord | null;
  /** The ID hash this account holds, if any. Server-only: it never sits on the user's own document. */
  heldIdHash: string | null;
  /** Who holds the hash being claimed in this transaction, if one is. */
  claimOwner: string | null;
  /** A business's credit ledger, in order; empty for anyone else. */
  credits: CreditEntry[];
}

/**
 * What a decision changes. A change to the user or business carries exactly
 * one audit action; each new ledger entry gets its own (firestoreLedger.ts).
 */
export interface ProfileWrite {
  user?: UserRecord;
  business?: BusinessRecord;
  claimIdHash?: string;
  /** Credit entries to append to this business's ledger. */
  ledger?: CreditEntry[];
  audit: AuditAction | null;
}

export interface Plan<R> {
  write: ProfileWrite | null;
  result: R;
}

export interface ProfileRepository {
  /**
   * One transaction: read the account (and who owns claimHash), let plan
   * decide, then apply its writes and its audit entry together. If plan
   * throws, nothing is written. plan may run more than once on contention, so
   * it must be pure.
   */
  transact<R>(uid: string, claimHash: string | null, plan: (state: StoredProfile) => Plan<R>): Promise<R>;
}
