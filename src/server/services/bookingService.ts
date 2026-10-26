import "server-only";
import { RULES } from "@/config/rules";
import { BOOKING_COPY, REPORT_COPY } from "@/domain/bookingMessages";
import { DEMO_COPY } from "@/domain/demoCopy";
import { cancelOutcome, decideCancel, type CancelOutcome, decideReport, mapsUrl, mayViewPhoto, partyOf, statusView, whatsAppUrl, type BookingRecord } from "@/domain/bookings";
import type { Party } from "@/domain/cancellation";
import type { ReportCategory } from "@/domain/cases";
import { dayOptions, decideSkipToDay, methodsFor } from "@/domain/day";
import { canAddEvidence } from "@/domain/evidence";
import type { Viewer } from "@/domain/demo";
import { displayPhone, photoPath, type PhotoKind } from "@/domain/profile";
import { settlementCredit } from "@/domain/settlement";
import { addDays } from "@/domain/time";
import type { BookingViewResponse } from "@/schemas/booking";
import { AppError } from "../errors";
import type { BookingRepository } from "../repositories/bookingRepository";
import type { BookingSecrets } from "../repositories/offerRepository";
import type { PhotoStore } from "../repositories/photoStore";

export interface BookingServiceDeps {
  bookings: BookingRepository;
  photos: PhotoStore;
  now: () => Date;
}

const notFound = () => new AppError(404, "not_found", BOOKING_COPY.notFound);
const GRACE_WINDOW_DAYS = 30;

/** What this party may see of the booking: the owner gets the payout number, the young person the check-in code. */
function bookingView(bookingId: string, booking: BookingRecord, secrets: BookingSecrets, party: Party, outcome: CancelOutcome | null, now: Date, remind: boolean): BookingViewResponse {
  const isOwner = party === "business";
  return {
    id: bookingId,
    tryoutId: booking.tryoutId,
    party,
    title: booking.title,
    businessName: booking.businessName,
    businessArea: booking.businessArea,
    workerFirstName: booking.workerFirstName,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    hours: booking.hours,
    rateCentsPerHour: booking.rateCentsPerHour,
    payCents: booking.payCents,
    status: booking.status,
    mapsUrl: mapsUrl(booking.location),
    pinAccuracyMetres: booking.location.accuracyMetres,
    photo: isOwner ? { subject: booking.workerId, kind: "profile" } : { subject: booking.ownerId, kind: "shopfront" },
    payoutPhone: isOwner ? displayPhone(booking.workerPayoutPhone) : null,
    owner: !isOwner && booking.ownerFirstName ? { firstName: booking.ownerFirstName, subject: booking.ownerId } : null,
    whatsappUrl: isOwner ? whatsAppUrl(booking.workerPayoutPhone) : booking.ownerPhone ? whatsAppUrl(booking.ownerPhone) : null,
    // The code is the young person's to show at the door: the owner never receives it.
    checkInCode: isOwner ? null : secrets.checkInCode,
    shareToken: isOwner ? null : secrets.shareToken,
    cancel: outcome ? { kind: outcome.kind, owedCents: outcome.settlement.wage?.amountCents ?? 0 } : null,
    day: {
      ...dayOptions(party, booking, now),
      checkedInAt: booking.checkedInAt?.toISOString() ?? null,
      endReason: booking.ended?.reason ?? null,
      owedCents: booking.owedCents ?? 0,
      owedMinimumCents: booking.owedMinimumCents ?? booking.owedCents ?? 0,
      payment: booking.payment ? { state: booking.payment.state, method: booking.payment.method ?? null, amountCents: booking.payment.amountCents ?? null, reference: booking.payment.reference ?? null } : null,
      payMethods: [...methodsFor(booking)],
      // The door check's two facts, for the owner only, and only while they're needed.
      door: isOwner && booking.status === "booked" ? { lastFour: booking.workerIdLastFour } : null,
      remind,
      evidence: { canAdd: canAddEvidence(party, booking), sent: (booking.evidenceBy ?? []).includes(party) },
    },
  };
}

/**
 * The booking page for both parties, cancelling through settle(), reports,
 * the public status page and photos between people who are linked. Every
 * decision comes from src/domain (bookings.ts, settlement.ts).
 */
export function createBookingService({ bookings, photos, now }: BookingServiceDeps) {
  const graceCancels = (uid: string) => bookings.graceCancelsSince(uid, addDays(now(), -GRACE_WINDOW_DAYS));

  async function own(viewer: Viewer, bookingId: string) {
    const found = await bookings.get(bookingId);
    const party = partyOf(viewer, found?.booking ?? null);
    if (!found || !party) throw notFound();
    return { ...found, party };
  }

  return {
    /** reminders: the bookings the deadline sweep says the young person should be reminded about (dayService.ts). */
    async view(viewer: Viewer, bookingId: string, reminders: readonly string[] = []): Promise<BookingViewResponse> {
      const { booking, secrets, party } = await own(viewer, bookingId);
      const outcome = booking.status === "booked" ? cancelOutcome(party, booking, now(), await graceCancels(viewer.uid)) : null;
      return bookingView(bookingId, booking, secrets, party, outcome, now(), reminders.includes(bookingId));
    },

    /** Cancels, classified free or late by the cancellation rules and settled by settle(): wage, credit and strike together. */
    async cancel(viewer: Viewer, bookingId: string): Promise<{ status: "cancelled" | "unchanged" }> {
      const recent = await graceCancels(viewer.uid);
      return bookings.transactBooking<{ status: "cancelled" | "unchanged" }>(bookingId, viewer.uid, ({ booking, ownerLedger }) => {
        const at = now();
        const decision = decideCancel(viewer, booking, at, recent);
        if (decision.kind === "refuse") throw decision.problem === "not_found" ? notFound() : new AppError(409, "started", BOOKING_COPY.started);
        if (decision.kind === "unchanged" || !booking) return { write: null, result: { status: "unchanged" } };
        const { party, outcome } = decision;
        const credit = settlementCredit(outcome.settlement, ownerLedger, booking.tryoutId);
        const changes: Partial<BookingRecord> = {
          status: "cancelled",
          cancellation: { by: party, byUid: viewer.uid, at, kind: outcome.kind, reliedOnGrace: outcome.reliedOnGrace },
          owedCents: outcome.settlement.wage?.amountCents ?? 0,
          owedMinimumCents: outcome.settlement.wage?.minimumCents ?? 0,
          // A business that cancels late owes 4 hours, paid and confirmed like any other day (day.ts).
          payment: outcome.settlement.wage ? { state: "awaiting_payment" } : null,
        };
        return {
          write: {
            booking: changes,
            tryoutStatus: "withdrawn",
            applicationStatus: party === "business" ? "cancelled" : "withdrawn",
            ledger: credit.kind === "append" ? credit.entries : [],
            strike: outcome.settlement.strike,
            audit: `booking_cancelled_${outcome.kind}`,
          },
          result: { status: "cancelled" },
        };
      });
    },

    /** Demo only: moves a demo booking's day to now, so a judge can try the door at any hour (day.ts, decideSkipToDay). */
    async skipToDay(viewer: Viewer, bookingId: string): Promise<{ status: "skipped" | "unchanged" }> {
      return bookings.transactBooking<{ status: "skipped" | "unchanged" }>(bookingId, viewer.uid, ({ booking }) => {
        const decision = decideSkipToDay(viewer, booking, now());
        if (decision.kind === "refuse") {
          if (decision.problem === "not_found") throw notFound();
          throw decision.problem === "not_demo" ? new AppError(403, "not_demo", DEMO_COPY.notDemo) : new AppError(409, "not_booked", DEMO_COPY.skipNotBooked);
        }
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged" } };
        return { write: { booking: { startAt: decision.startAt, endAt: decision.endAt }, audit: "demo_skipped_to_day" }, result: { status: "skipped" } };
      });
    },

    async report(viewer: Viewer, bookingId: string, category: ReportCategory, note: string): Promise<{ paused: boolean }> {
      const found = await bookings.get(bookingId);
      const decision = decideReport(viewer, found?.booking ?? null, found?.booking.tryoutId ?? "", category, note);
      if (decision.kind === "refuse") throw decision.problem === "not_found" ? notFound() : new AppError(422, "category", REPORT_COPY.categoryMissing);
      await bookings.report(decision.reviewCase, viewer.uid, decision.pauseBusiness);
      return { paused: decision.pauseBusiness };
    },

    /** The public status page: null when the token is unknown or the link has expired, so the two look the same. */
    async status(token: string) {
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
      const booking = await bookings.byShareToken(token);
      return booking ? statusView(booking, now()) : null;
    },

    async photo(viewer: Viewer, subjectUid: string, kind: PhotoKind) {
      const relation = viewer.uid === subjectUid ? { appliedToViewer: false, bookedTogether: false } : await bookings.relation(viewer.uid, subjectUid);
      if (!mayViewPhoto(viewer.uid, subjectUid, kind, relation)) return null;
      const file = await photos.download(photoPath(subjectUid, kind));
      return file && RULES.photoContentTypes.some((type) => type === file.contentType) ? file : null;
    },
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
