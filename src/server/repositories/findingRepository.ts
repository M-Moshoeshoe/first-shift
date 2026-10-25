import type { ApplicationRecord } from "@/domain/applications";
import type { Listing } from "@/domain/nearby";
import type { TryoutWindow } from "@/domain/schedule";
import type { TryoutRecord } from "@/domain/tryoutDecisions";

/** Who did what to which application; no personal data. */
export type ApplicationAuditAction = "application_made" | "application_withdrawn";

export interface ApplicationState {
  tryout: TryoutRecord | null;
  application: ApplicationRecord | null;
  /** The young person's booked tryouts, for the overlap rule. */
  bookings: TryoutWindow[];
}

export interface ApplicationPlan<R> {
  /** The application as it should be stored, the change to the tryout's applicant count, and the audit entry, written together. */
  write: { application: ApplicationRecord; applicantsDelta: 1 | -1; audit: ApplicationAuditAction } | null;
  result: R;
}

/** Reading published tryouts for young people, and applying. Firestore in production; fakes in tests. */
export interface FindingRepository {
  /**
   * Published tryouts whose cell is in any of these geohash ranges, or whose
   * area is one of these (the young person's taxi routes), each with its
   * business's track record and injury cover.
   */
  publishedIn(bounds: readonly [string, string][], areas: readonly string[]): Promise<Listing[]>;
  /** One tryout, whatever its status, with its business; null if there's no such tryout. */
  listing(id: string): Promise<Listing | null>;
  /** The tryout, this young person's application to it, and their bookings, read together. */
  read(tryoutId: string, workerId: string): Promise<ApplicationState>;
  /**
   * One transaction: read the same state, let plan decide, then write the
   * application, the tryout's applicant count and the audit entry together.
   * If plan throws, nothing is written. plan may run more than once, so it must be pure.
   */
  transact<R>(tryoutId: string, workerId: string, plan: (state: ApplicationState) => ApplicationPlan<R>): Promise<R>;
}
