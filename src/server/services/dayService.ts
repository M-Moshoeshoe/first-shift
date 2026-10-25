import "server-only";
import type { BookingRecord, CheckoutReason, Payment } from "@/domain/bookings";
import type { ReviewCase } from "@/domain/cases";
import { decideBusinessNotOpen, decideCheckIn, decideCheckOut, decideConfirm, decideMarkPaid, decideNoShow, deadlineActions, payRecordCounters, unpaidPause, wasOnTime, type DoorCheck, type MarkPaid } from "@/domain/day";
import { CHECK_IN_MESSAGES, MARK_PAID_MESSAGES } from "@/domain/dayMessages";
import type { Viewer } from "@/domain/demo";
import { settlementCredit } from "@/domain/settlement";
import { AppError } from "../errors";
import { log } from "../log";
import type { BookingRepository, BookingWrite } from "../repositories/bookingRepository";
import type { EvidenceStore } from "../repositories/photoStore";
import { addEvidence } from "./evidenceStep";

export interface DayServiceDeps {
  bookings: BookingRepository;
  evidence: EvidenceStore;
  /** A random part for each evidence path, so a file is never overwritten. */
  newId: () => string;
  now: () => Date;
}

type Step = { status: "done" | "unchanged" };
const NOT_FOUND = "We can't find that booking. Go back and check your tryouts.";
const NOT_NOW = "That can't be done on this booking right now. Reload the page to see where it stands.";
const refuse = (problem: "not_found" | string, message: string) => new AppError(problem === "not_found" ? 404 : 409, problem, message);

/**
 * The day, from the door to Received. It holds no rules of its own: each step
 * is decided in src/domain (day.ts), every amount and credit comes from
 * settle(), and each step is one transaction with its audit entry.
 */
export function createDayService({ bookings, evidence, newId, now }: DayServiceDeps) {
  return {
    async checkIn(viewer: Viewer, bookingId: string, check: DoorCheck): Promise<Step> {
      const outcome = await bookings.transactBooking<Step | { refused: keyof typeof CHECK_IN_MESSAGES }>(bookingId, viewer.uid, ({ booking, secrets }) => {
        const at = now();
        const decision = decideCheckIn(viewer, booking, secrets, check, at);
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged" } };
        // A wrong code is counted before it's refused, so a code can't be guessed by trying them all.
        if (decision.kind === "refuse" && decision.problem === "wrong_code") return { write: { codeAttempt: true, audit: "check_in_wrong_code" }, result: { refused: "wrong_code" } };
        if (decision.kind === "refuse") return { write: null, result: { refused: decision.problem } };
        return { write: { booking: { status: "checked_in", checkedInAt: at }, audit: "checked_in" }, result: { status: "done" } };
      });
      if ("refused" in outcome) {
        log("warn", "check_in_refused", { bookingId, problem: outcome.refused });
        throw refuse(outcome.refused, CHECK_IN_MESSAGES[outcome.refused]);
      }
      return outcome;
    },

    /** The owner records a no-show: nothing owed, the credit returned, a strike, and a review (settle()). */
    async noShow(viewer: Viewer, bookingId: string): Promise<Step> {
      return bookings.transactBooking<Step>(bookingId, viewer.uid, ({ booking, ownerLedger }) => {
        const decision = decideNoShow(viewer, bookingId, booking, now());
        if (decision.kind === "refuse") throw refuse(decision.problem, decision.problem === "not_found" ? NOT_FOUND : NOT_NOW);
        if (decision.kind === "unchanged" || !booking) return { write: null, result: { status: "unchanged" } };
        const credit = settlementCredit(decision.settlement, ownerLedger, booking.tryoutId);
        const ledger = credit.kind === "append" ? credit.entries : [];
        return { write: { booking: { status: "no_show", owedCents: 0 }, tryoutStatus: "withdrawn", ledger, strike: decision.settlement.strike, review: decision.review, audit: "no_show_marked" }, result: { status: "done" } };
      });
    },

    async businessNotOpen(viewer: Viewer, bookingId: string): Promise<Step> {
      return bookings.transactBooking<Step>(bookingId, viewer.uid, ({ booking }) => {
        const decision = decideBusinessNotOpen(viewer, bookingId, booking, now());
        if (decision.kind === "refuse") throw refuse(decision.problem, decision.problem === "not_found" ? NOT_FOUND : NOT_NOW);
        return { write: { review: decision.review, audit: "business_not_open_reported" }, result: { status: "done" } };
      });
    },

    /** Check-out: settle() works out what's owed and uses the credit; both records count a completed tryout. */
    async checkOut(viewer: Viewer, bookingId: string, reason: CheckoutReason): Promise<Step> {
      return bookings.transactBooking<Step>(bookingId, viewer.uid, ({ booking, ownerLedger }) => {
        const at = now();
        const decision = decideCheckOut(viewer, bookingId, booking, reason, at);
        if (decision.kind === "refuse") throw refuse(decision.problem, decision.problem === "not_found" ? NOT_FOUND : NOT_NOW);
        if (decision.kind === "unchanged" || !booking) return { write: null, result: { status: "unchanged" } };
        const { settlement, review } = decision;
        const credit = settlementCredit(settlement, ownerLedger, booking.tryoutId);
        return {
          write: {
            booking: { status: "ended", ended: { at, reason, minutesWorked: decision.minutesWorked ?? 0 }, owedCents: settlement.wage?.amountCents ?? 0, owedMinimumCents: settlement.wage?.minimumCents ?? 0, payment: { state: "awaiting_payment" } },
            tryoutStatus: "completed",
            ledger: credit.kind === "append" ? credit.entries : [],
            review,
            counters: { worker: wasOnTime(booking) ? ["completed", "onTime"] : ["completed"], business: ["completed"] },
            audit: `checked_out_${reason}`,
          },
          result: { status: "done" },
        };
      });
    },

    /** The owner paid, by their own means, and says so. Paying the tryout a pause was for lifts the pause. */
    async markPaid(viewer: Viewer, bookingId: string, paid: MarkPaid): Promise<Step> {
      return bookings.transactBooking<Step>(bookingId, viewer.uid, ({ booking, businessPausedFor }) => {
        const decision = decideMarkPaid(viewer, booking, paid, now());
        if (decision.kind === "refuse") throw refuse(decision.problem, MARK_PAID_MESSAGES[decision.problem]);
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged" } };
        const lift = businessPausedFor === unpaidPause(bookingId) ? { business: { status: "active" as const, pausedFor: null } } : {};
        return { write: { booking: { payment: decision.payment }, ...lift, audit: `marked_paid_${paid.method}` }, result: { status: "done" } };
      });
    },

    /**
     * The young person answers. Either answer counts once towards the
     * business's "Paid on time" line; Not received also opens a review and
     * pauses the business until it's sorted out.
     */
    async confirm(viewer: Viewer, bookingId: string, received: boolean): Promise<Step> {
      return bookings.transactBooking<Step>(bookingId, viewer.uid, ({ booking }) => {
        const decision = decideConfirm(viewer, bookingId, booking, received, now());
        if (decision.kind === "refuse") throw refuse(decision.problem, decision.problem === "not_found" ? NOT_FOUND : NOT_NOW);
        if (decision.kind === "unchanged" || !booking) return { write: null, result: { status: "unchanged" } };
        return { write: answerWrite(bookingId, booking, decision, received), result: { status: "done" } };
      });
    },

    /** Proof, only after Not received: one screenshot and a note from each side (evidenceStep.ts). */
    addEvidence: (viewer: Viewer, bookingId: string, bytes: Uint8Array, note: string): Promise<Step> => addEvidence({ bookings, evidence, newId }, viewer, bookingId, bytes, note),

    sweepDeadlines: (viewer: Viewer) => sweepDeadlines(bookings, viewer, now()),
  };
}

/** What the young person's answer writes: the payment, its one count on the "Paid on time" line, and for Not received a review and a pause. */
function answerWrite(bookingId: string, booking: BookingRecord, decision: { payment: Payment; review: ReviewCase | null }, received: boolean): BookingWrite {
  const counted = payRecordCounters(booking, received ? "received" : "not_received");
  const record = counted ? { counters: { business: counted } } : {};
  if (received) return { booking: { payment: decision.payment, payCounted: true }, ...record, audit: "payment_received" };
  return { booking: { payment: decision.payment, reviewOpened: true, payCounted: true }, ...record, review: decision.review, business: { status: "paused", pausedFor: unpaidPause(bookingId) }, audit: "payment_not_received" };
}

/**
 * The payment deadlines, worked out from the clock whenever either party
 * opens a screen (docs/RULES.md, Payment confirmation): pause an unpaid
 * business from 00:00, and send a silent one to review at 72 hours. Each
 * acts once. Returns the bookings whose young person should see a reminder.
 */
export async function sweepDeadlines(bookings: BookingRepository, viewer: Viewer, at: Date): Promise<string[]> {
  // A set: a transaction's plan may run more than once.
  const reminders = new Set<string>();
  for (const { id } of await bookings.awaitingPayment(viewer.uid)) {
    await bookings.transactBooking<null>(id, viewer.uid, ({ booking, businessPausedFor }) => {
      if (!booking) return { write: null, result: null };
      const actions = deadlineActions(id, booking, businessPausedFor, at);
      if (actions.remindWorker) reminders.add(id);
      if (actions.pauseBusiness) {
        // Paused unpaid counts once as a late payment on the business's "Paid on time" line.
        const counted = payRecordCounters(booking, "paused_unpaid");
        const record = counted ? { counters: { business: counted }, booking: { payCounted: true } } : {};
        return { write: { business: { status: "paused", pausedFor: unpaidPause(id) }, ...record, audit: "business_paused_unpaid" }, result: null };
      }
      if (actions.review) return { write: { review: actions.review, booking: { reviewOpened: true }, audit: "payment_unconfirmed_review" }, result: null };
      return { write: null, result: null };
    });
  }
  return [...reminders];
}

export type DayService = ReturnType<typeof createDayService>;
