import type { Viewer } from "./demo";
import { classifyCancellation, reliesOnGrace, type CancellationKind, type Party } from "./cancellation";
import { newReport, pausesBusinessAtOnce, reportCategoriesFor, type ReportCategory, type ReviewCase } from "./cases";
import type { BusinessRecord, Location, UserRecord } from "./profile";
import { settle, type SettleEvent, type Settlement } from "./settlement";
import { addDays, atSastTime } from "./time";
import type { PaymentMethod, PaymentState } from "./paymentFlow";
import type { TryoutRecord } from "./tryoutDecisions";

import type { BookingStatus } from "./bookingStatus";

/**
 * bookings/{id}: one per accepted offer, readable only by its two parties
 * (firestore.rules). It carries what each needs on the day, including the
 * exact pin, revealed only now. The check-in code and the share token live
 * apart, in bookingSecrets, which no client can read.
 */
export interface BookingRecord {
  tryoutId: string;
  ownerId: string;
  workerId: string;
  demo: boolean;
  title: string;
  businessName: string;
  businessArea: string;
  location: Location;
  workerFirstName: string;
  workerArea: string;
  /** 27XXXXXXXXX: the owner pays to it and can message the young person on it. */
  workerPayoutPhone: string;
  /** How the young person can be paid, as their profile said when they were booked. Bookings from before it was asked have none: any method. */
  workerPayMethods?: PaymentMethod[];
  /** The owner's first name and contact number, for the young person once booked (docs/RULES.md, Accountability). Absent on bookings from before they were asked. */
  ownerFirstName?: string;
  ownerPhone?: string;
  startAt: Date;
  endAt: Date;
  hours: number;
  rateCentsPerHour: number;
  payCents: number;
  status: BookingStatus;
  bookedAt: Date;
  cancellation?: { by: Party; byUid: string; at: Date; kind: Exclude<CancellationKind, "after_start">; reliedOnGrace: boolean } | null;
  /** What the business owes the young person after the booking ended, from settle(); null while nothing is settled. */
  owedCents?: number | null;
  /** The lowest the owner may pay (pay.ts): below the full amount only when the young person left early. */
  owedMinimumCents?: number | null;
  /** For the door check: the last four digits on the young person's ID card. Shown to the owner only at check-in. */
  workerIdLastFour: string;
  checkedInAt?: Date | null;
  ended?: { at: Date; reason: CheckoutReason; minutesWorked: number } | null;
  payment?: Payment | null;
  /** Each deadline acts once (day.ts, deadlineActions). */
  reviewOpened?: boolean;
  /** Counted once towards the business's "Paid on time" line (day.ts, payRecordCounters). */
  payCounted?: boolean;
  /** Who has added a screenshot after "Not received": one each (evidence.ts). */
  evidenceBy?: Party[];
}

export const CHECKOUT_REASONS = ["completed", "finished_early", "worker_left_early", "business_ended_early", "safety"] as const;
export type CheckoutReason = (typeof CHECKOUT_REASONS)[number];

export interface Payment {
  state: PaymentState;
  method?: PaymentMethod;
  amountCents?: number;
  /** The reference the owner's bank shows, for an electronic payment; never for cash. */
  reference?: string;
  markedPaidAt?: Date;
  answeredAt?: Date;
}

/** The booking an accepted offer makes. Null if either profile lacks what the day needs (a complete profile always has it). */
export function newBooking(tryoutId: string, tryout: TryoutRecord, business: BusinessRecord | null, workerId: string, worker: UserRecord | null, now: Date): BookingRecord | null {
  if (!business?.location || !business.name || !worker?.firstName || !worker.area || !worker.payoutPhone || !worker.idLastFour) return null;
  return {
    tryoutId,
    ownerId: tryout.ownerId,
    workerId,
    demo: tryout.demo,
    title: tryout.title,
    businessName: business.name,
    businessArea: tryout.area,
    location: business.location,
    workerFirstName: worker.firstName,
    workerArea: worker.area,
    workerPayoutPhone: worker.payoutPhone,
    ...(worker.payMethods?.length ? { workerPayMethods: worker.payMethods } : {}),
    ...(business.ownerFirstName && business.ownerPhone ? { ownerFirstName: business.ownerFirstName, ownerPhone: business.ownerPhone } : {}),
    workerIdLastFour: worker.idLastFour,
    startAt: tryout.startAt,
    endAt: tryout.endAt,
    hours: tryout.hours,
    rateCentsPerHour: tryout.rateCentsPerHour,
    payCents: tryout.payCents,
    status: "booked",
    bookedAt: now,
    cancellation: null,
    owedCents: null,
  };
}

/** Which side of the booking the viewer is on, or null if neither: someone else's booking reads as not found. */
export function partyOf(viewer: Viewer, booking: Pick<BookingRecord, "ownerId" | "workerId"> | null): Party | null {
  if (!booking) return null;
  if (booking.ownerId === viewer.uid) return "business";
  return booking.workerId === viewer.uid ? "young_person" : null;
}

/** The public status page stops working at midnight (SAST) at the end of the tryout's day. */
export const statusExpiresAt = (booking: Pick<BookingRecord, "startAt">): Date => atSastTime(addDays(booking.startAt, 1), 0, 0);

/** "Open in maps": a link the phone opens in its own maps app. No map tiles on our pages. */
export const mapsUrl = (location: Pick<Location, "latitude" | "longitude">): string => `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

export const whatsAppUrl = (phone: string, text?: string): string => `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export interface CancelOutcome {
  kind: Exclude<CancellationKind, "after_start">;
  reliedOnGrace: boolean;
  settlement: Settlement;
}

/** What cancelling now would mean, for the party asking: free or late, and what it settles (docs/MONEY.md). Null once it has started. */
export function cancelOutcome(party: Party, booking: BookingRecord, now: Date, recentGraceCancels: number): CancelOutcome | null {
  const kind = classifyCancellation({ now, bookedAt: booking.bookedAt, start: booking.startAt, recentGraceCancels });
  if (kind === "after_start") return null;
  const event: SettleEvent =
    kind === "free"
      ? { kind: "free_cancel", by: party }
      : party === "business"
        ? { kind: "business_late_cancel", rateCentsPerHour: booking.rateCentsPerHour, agreedHours: booking.hours }
        : { kind: "worker_late_cancel" };
  return { kind, reliedOnGrace: kind === "free" && reliesOnGrace(now, booking.startAt), settlement: settle(event) };
}

export type CancelDecision = { kind: "cancel"; party: Party; outcome: CancelOutcome } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_found" | "started" };

/** Either party may cancel a booking until it starts; after that it's a no-show or a check-out, not a cancellation. */
export function decideCancel(viewer: Viewer, booking: BookingRecord | null, now: Date, recentGraceCancels: number): CancelDecision {
  const party = partyOf(viewer, booking);
  if (!party || !booking) return { kind: "refuse", problem: "not_found" };
  if (booking.status === "cancelled") return { kind: "unchanged" };
  if (booking.status !== "booked") return { kind: "refuse", problem: "started" };
  const outcome = cancelOutcome(party, booking, now, recentGraceCancels);
  return outcome ? { kind: "cancel", party, outcome } : { kind: "refuse", problem: "started" };
}

/**
 * Report a problem, from either side. Every report opens a review case. When
 * the young person reports harassment or unsafe work, the business is paused
 * at once (cases.ts); a business's report waits for review.
 */
export function decideReport(viewer: Viewer, booking: BookingRecord | null, tryoutId: string, category: ReportCategory, note: string): { kind: "report"; reviewCase: ReviewCase; pauseBusiness: boolean } | { kind: "refuse"; problem: "not_found" | "category" } {
  const party = partyOf(viewer, booking);
  if (!party || !booking) return { kind: "refuse", problem: "not_found" };
  if (!reportCategoriesFor(party).includes(category)) return { kind: "refuse", problem: "category" };
  const reviewCase = newReport({ category, tryoutId, reporterId: viewer.uid, businessId: booking.ownerId, note });
  return { kind: "report", reviewCase, pauseBusiness: party === "young_person" && pausesBusinessAtOnce(category) };
}

/** What a status page may show: first names, the business, the times and the status. Nothing else, and nothing once it has expired. */
export function statusView(booking: BookingRecord, now: Date): { workerFirstName: string; businessName: string; businessArea: string; startAt: string; endAt: string; status: BookingStatus } | null {
  if (now >= statusExpiresAt(booking)) return null;
  return { workerFirstName: booking.workerFirstName, businessName: booking.businessName, businessArea: booking.businessArea, startAt: booking.startAt.toISOString(), endAt: booking.endAt.toISOString(), status: booking.status };
}

/**
 * Who sees whose photo: your own; an applicant's face, by the owner they
 * applied to; and each other's, once booked together (the young person sees
 * the shopfront to find the door). Nobody else, so demo and real never meet.
 */
export function mayViewPhoto(viewerUid: string, subjectUid: string, kind: "profile" | "shopfront", relation: { appliedToViewer: boolean; bookedTogether: boolean }): boolean {
  if (viewerUid === subjectUid) return true;
  return kind === "profile" ? relation.appliedToViewer || relation.bookedTogether : relation.bookedTogether;
}
