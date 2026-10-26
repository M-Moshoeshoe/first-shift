import "server-only";
import { partyOf, whatsAppUrl, type BookingRecord } from "@/domain/bookings";
import type { Viewer } from "@/domain/demo";
import { decideHireAnswer, decideHireOutcome, hireOfferDue, hireOfferId, jobDetails, jobOfferProblem, type HireAnswer, type HireOfferRecord, type HireOutcome, type JobOfferInput } from "@/domain/hire";
import { HIRE_COPY } from "@/domain/recordCopy";
import type { ApplicationsResponse } from "@/schemas/booking";
import type { HireViewResponse } from "@/schemas/record";
import { AppError } from "../errors";
import type { BookingRepository } from "../repositories/bookingRepository";
import type { HireRepository } from "../repositories/hireRepository";
import { BOOKING_NOT_FOUND } from "@/domain/bookingMessages";

export interface HireServiceDeps {
  hires: HireRepository;
  bookings: Pick<BookingRepository, "get">;
  now: () => Date;
}

const OFFER_NOT_FOUND = "We cannot find that job offer. Go back to Applications and check.";
const NOT_DUE = "A job offer comes up after three tryouts together, or when another tryout would make this regular employment.";
const ALREADY_ANSWERED = "You have already answered this job offer.";
const ALREADY_MARKED = "You have already marked how this job offer went.";

/** The prefilled WhatsApp message to the young person, from the owner, which they can change before sending. */
const ownerMessage = (offer: HireOfferRecord, workerPhone: string) =>
  whatsAppUrl(workerPhone, HIRE_COPY.whatsapp(offer.workerFirstName, offer.ownerFirstName || offer.businessName, offer.businessName, offer.details, offer.message));

/** "I'm interested": a WhatsApp message to the owner, when there's a number to send it to. */
const interestedMessage = (offer: HireOfferRecord) =>
  offer.ownerPhone ? whatsAppUrl(offer.ownerPhone, HIRE_COPY.interestedText(offer.ownerFirstName || offer.businessName, offer.businessName)) : null;

/** One job offer under the young person's Applications. */
export const jobOfferView = (offer: HireOfferRecord & { id: string }): ApplicationsResponse["jobOffers"][number] => ({
  id: offer.id,
  businessName: offer.businessName,
  ownerFirstName: offer.ownerFirstName || offer.businessName,
  kind: offer.kind,
  details: offer.details,
  message: offer.message,
  answer: offer.answer,
  whatsappUrl: interestedMessage(offer),
  at: offer.at.toISOString(),
});

/**
 * "Offer {name} a job" on the owner's booking page, when it's due (hire.ts):
 * an invitation to talk, or an offer with the role, days and pay, recorded
 * once per pair and sent by the owner on WhatsApp. The young person answers
 * "I'm interested" or "Not right now"; the owner later marks Hired or Did not
 * work out. Every decision comes from domain/hire.ts.
 */
export function createHireService({ hires, bookings, now }: HireServiceDeps) {
  async function owned(viewer: Viewer, bookingId: string) {
    const found = await bookings.get(bookingId);
    if (!found || partyOf(viewer, found.booking) !== "business") throw new AppError(404, "not_found", BOOKING_NOT_FOUND);
    return found.booking;
  }

  async function state(booking: BookingRecord): Promise<HireViewResponse> {
    const pair = await hires.pair(booking.ownerId, booking.workerId);
    const offer = pair.offer;
    // Only once a tryout together has ended: never while someone is still booked for the first time.
    const due = booking.status === "ended" && hireOfferDue(pair.completed, pair.slots, now(), offer !== null);
    return {
      due,
      offer: offer ? { kind: offer.kind, details: offer.details, answer: offer.answer, outcome: offer.outcome } : null,
      whatsappUrl: offer ? ownerMessage(offer, booking.workerPayoutPhone) : null,
    };
  }

  return {
    async view(viewer: Viewer, bookingId: string): Promise<HireViewResponse> {
      return state(await owned(viewer, bookingId));
    },

    async offer(viewer: Viewer, bookingId: string, input: JobOfferInput): Promise<HireViewResponse> {
      const booking = await owned(viewer, bookingId);
      const current = await state(booking);
      if (current.offer) return current;
      if (!current.due) throw new AppError(409, "not_due", NOT_DUE);
      // The pay floor and the rest, in code whatever the form sent (hire.ts).
      const problem = jobOfferProblem(input);
      if (problem) throw new AppError(422, problem, HIRE_COPY.problems[problem]);
      await hires.create(
        {
          ownerId: booking.ownerId,
          workerId: booking.workerId,
          businessName: booking.businessName,
          bookingId,
          demo: booking.demo,
          at: now(),
          kind: input.kind,
          details: jobDetails(input),
          message: input.message.trim(),
          answer: null,
          outcome: null,
          workerFirstName: booking.workerFirstName,
          ownerFirstName: booking.ownerFirstName ?? "",
          ownerPhone: booking.ownerPhone ?? null,
        },
        viewer.uid,
      );
      return state(booking);
    },

    async outcome(viewer: Viewer, bookingId: string, outcome: HireOutcome): Promise<HireViewResponse> {
      const booking = await owned(viewer, bookingId);
      await hires.transact(hireOfferId(booking.ownerId, booking.workerId), viewer.uid, (offer) => {
        const decision = decideHireOutcome(viewer.uid, offer, outcome);
        if (decision.kind === "refuse") throw decision.problem === "not_found" ? new AppError(404, "not_found", OFFER_NOT_FOUND) : new AppError(409, "already_marked", ALREADY_MARKED);
        return { write: decision.kind === "mark" ? { outcome, audit: `hire_${outcome}` } : null, result: null };
      });
      return state(booking);
    },

    /** The young person's answer, once. "I'm interested" also gives them a WhatsApp message to the owner. */
    async answer(viewer: Viewer, offerId: string, answer: HireAnswer): Promise<{ status: "answered" | "unchanged"; whatsappUrl: string | null }> {
      return hires.transact<{ status: "answered" | "unchanged"; whatsappUrl: string | null }>(offerId, viewer.uid, (offer) => {
        const decision = decideHireAnswer(viewer.uid, offer, answer);
        if (decision.kind === "refuse" || !offer) throw decision.kind === "refuse" && decision.problem === "already_answered" ? new AppError(409, "already_answered", ALREADY_ANSWERED) : new AppError(404, "not_found", OFFER_NOT_FOUND);
        const whatsappUrl = answer === "interested" ? interestedMessage(offer) : null;
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged", whatsappUrl } };
        return { write: { answer, audit: `hire_answer_${answer}` }, result: { status: "answered", whatsappUrl } };
      });
    },
  };
}

export type HireService = ReturnType<typeof createHireService>;
