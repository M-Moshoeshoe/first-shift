import { RULES } from "@/config/rules";
import { sameWorld, type Viewer } from "./demo";
import { isProfileComplete, type UserRecord } from "./profile";
import { canTakePart } from "./strikes";
import type { TryoutWindow } from "./schedule";
import { addMinutes } from "./time";
import type { TryoutRecord } from "./tryoutDecisions";

export type ApplicationStatus = "applied" | "withdrawn";

/**
 * applications/{tryoutId}_{workerId}: one per young person per tryout, so a
 * duplicate can't exist. Carries the tryout's times, so overlaps can be
 * checked without reading every tryout again.
 */
export interface ApplicationRecord {
  tryoutId: string;
  workerId: string;
  ownerId: string;
  note: string;
  status: ApplicationStatus;
  demo: boolean;
  startAt: Date;
  endAt: Date;
}

export const applicationId = (tryoutId: string, workerId: string): string => `${tryoutId}_${workerId}`;

/** Bookings close an hour before the start (docs/RULES.md), and only a published tryout takes them. */
export const bookingOpen = (tryout: Pick<TryoutRecord, "status" | "startAt">, now: Date): boolean =>
  tryout.status === "published" && now <= addMinutes(tryout.startAt, -RULES.bookingCutoffMinutes);

const overlaps = (a: TryoutWindow, b: TryoutWindow): boolean => a.start < b.end && b.start < a.end;

export type NotEligibleReason = "not_young_person" | "profile_incomplete" | "account_paused" | "overlaps_booking";
export type ClosedReason = "booking_closed" | "not_open";

/** What the detail page offers this young person for this tryout. */
export type ApplyState = { kind: "can_apply" } | { kind: "applied" } | { kind: "closed"; reason: ClosedReason } | { kind: "not_eligible"; reason: NotEligibleReason };

export interface ApplyInputs {
  worker: UserRecord | null;
  tryout: TryoutRecord;
  application: ApplicationRecord | null;
  /** The young person's booked tryouts. */
  bookings: readonly TryoutWindow[];
  now: Date;
}

/**
 * Who may apply: a young person with a complete, active profile, to a
 * published tryout still open for booking, that doesn't overlap a tryout they're
 * booked on. Someone who has already applied sees that first, whatever else changed.
 */
export function applyState({ worker, tryout, application, bookings, now }: ApplyInputs): ApplyState {
  if (!worker || worker.role !== "young_person") return { kind: "not_eligible", reason: "not_young_person" };
  if (!canTakePart(worker.status)) return { kind: "not_eligible", reason: "account_paused" };
  if (!isProfileComplete(worker, null)) return { kind: "not_eligible", reason: "profile_incomplete" };
  if (application?.status === "applied") return { kind: "applied" };
  if (!bookingOpen(tryout, now)) return { kind: "closed", reason: tryout.status === "published" ? "booking_closed" : "not_open" };
  const window = { start: tryout.startAt, end: tryout.endAt };
  if (bookings.some((booked) => overlaps(booked, window))) return { kind: "not_eligible", reason: "overlaps_booking" };
  return { kind: "can_apply" };
}

export type ApplyDecision =
  | { kind: "apply"; record: ApplicationRecord }
  | { kind: "unchanged" }
  | { kind: "refuse"; problem: "not_found" | ClosedReason | NotEligibleReason };

/**
 * Applying. A tryout from the other world (demo or real) reads as not found,
 * like one that doesn't exist. Applying twice changes nothing, so a double tap
 * or a retry on weak signal is harmless.
 */
export function decideApply(viewer: Viewer, inputs: Omit<ApplyInputs, "tryout"> & { tryoutId: string; tryout: TryoutRecord | null }, note: string): ApplyDecision {
  const { tryout } = inputs;
  if (!tryout || !sameWorld(viewer, tryout)) return { kind: "refuse", problem: "not_found" };
  const state = applyState({ ...inputs, tryout });
  if (state.kind === "applied") return { kind: "unchanged" };
  if (state.kind !== "can_apply") return { kind: "refuse", problem: state.reason };
  return {
    kind: "apply",
    record: {
      tryoutId: inputs.tryoutId,
      workerId: viewer.uid,
      ownerId: tryout.ownerId,
      note: note.trim().slice(0, RULES.applicationNoteMaxChars),
      status: "applied",
      demo: viewer.demo,
      startAt: tryout.startAt,
      endAt: tryout.endAt,
    },
  };
}

export type WithdrawApplicationDecision = { kind: "withdraw" } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_found" };

/** The young person takes their application back. Someone else's reads as not found; twice changes nothing. */
export function decideWithdrawApplication(uid: string, application: ApplicationRecord | null): WithdrawApplicationDecision {
  if (!application || application.workerId !== uid) return { kind: "refuse", problem: "not_found" };
  return application.status === "withdrawn" ? { kind: "unchanged" } : { kind: "withdraw" };
}
