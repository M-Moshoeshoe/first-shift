import type { TryoutStatus } from "@/domain/tryout";
import type { TryoutRecord } from "@/domain/tryoutDecisions";

/** Who did what to which tryout; no personal data. */
export type TryoutAuditAction = "tryout_posted" | "tryout_sent_to_review" | "tryout_withdrawn";

export interface TryoutPlan<R> {
  /** The new status and its audit entry, written together, or nothing at all. */
  write: { status: TryoutStatus; audit: TryoutAuditAction } | null;
  result: R;
}

export interface TryoutRepository {
  /** Saves a new tryout and its audit entry in one transaction, and returns the tryout's id. */
  create(tryout: TryoutRecord, audit: TryoutAuditAction): Promise<string>;
  /**
   * One transaction: read the tryout, let plan decide, then write the new
   * status and its audit entry together. If plan throws, nothing is written.
   * plan may run more than once on contention, so it must be pure.
   */
  transact<R>(id: string, uid: string, plan: (tryout: TryoutRecord | null) => TryoutPlan<R>): Promise<R>;
}
