import type { BusinessRecord, UserRecord } from "@/domain/profile";

export type AuditAction = "role_set" | "worker_profile_saved" | "business_profile_saved" | "photo_saved";

/** Everything a profile decision needs about one account, read inside the transaction. */
export interface StoredProfile {
  user: UserRecord | null;
  business: BusinessRecord | null;
  /** The ID hash this account holds, if any. Server-only: it never sits on the user's own document. */
  heldIdHash: string | null;
  /** Who holds the hash being claimed in this transaction, if one is. */
  claimOwner: string | null;
}

/** What a decision changes. Every write carries exactly one audit action, written with it. */
export interface ProfileWrite {
  user?: UserRecord;
  business?: BusinessRecord;
  claimIdHash?: string;
  audit: AuditAction;
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
