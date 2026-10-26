import "server-only";
import { partyOf, whatsAppUrl, type BookingRecord } from "@/domain/bookings";
import type { Viewer } from "@/domain/demo";
import { hireOfferDue } from "@/domain/hire";
import { HIRE_COPY } from "@/domain/recordCopy";
import type { HireViewResponse } from "@/schemas/record";
import { AppError } from "../errors";
import type { BookingRepository } from "../repositories/bookingRepository";
import type { HireRepository } from "../repositories/hireRepository";

export interface HireServiceDeps {
  hires: HireRepository;
  bookings: Pick<BookingRepository, "get">;
  now: () => Date;
}

const NOT_FOUND = "We can't find that booking. Go back and check your tryouts.";
const NOT_DUE = "A job offer comes up after three tryouts together, or when another tryout would make this regular employment.";

/** The prefilled WhatsApp message to the young person, from the owner. */
const messageUrl = (booking: BookingRecord) =>
  whatsAppUrl(booking.workerPayoutPhone, HIRE_COPY.message(booking.workerFirstName, booking.ownerFirstName ?? booking.businessName, booking.businessName));

/**
 * "Offer {name} a job" on the owner's booking page, when it's due
 * (hire.ts): recorded once per pair, counted in the pilot metrics, and
 * sent by the owner as a WhatsApp message they can change.
 */
export function createHireService({ hires, bookings, now }: HireServiceDeps) {
  async function owned(viewer: Viewer, bookingId: string) {
    const found = await bookings.get(bookingId);
    if (!found || partyOf(viewer, found.booking) !== "business") throw new AppError(404, "not_found", NOT_FOUND);
    return found.booking;
  }

  async function state(booking: BookingRecord): Promise<HireViewResponse> {
    const pair = await hires.pair(booking.ownerId, booking.workerId);
    // Only once a tryout together has ended: never while someone is still booked for the first time.
    const due = booking.status === "ended" && hireOfferDue(pair.completed, pair.slots, now(), pair.offered);
    return { due, offered: pair.offered, whatsappUrl: pair.offered ? messageUrl(booking) : null };
  }

  return {
    async view(viewer: Viewer, bookingId: string): Promise<HireViewResponse> {
      return state(await owned(viewer, bookingId));
    },

    async offer(viewer: Viewer, bookingId: string): Promise<HireViewResponse> {
      const booking = await owned(viewer, bookingId);
      const current = await state(booking);
      if (current.offered) return current;
      if (!current.due) throw new AppError(409, "not_due", NOT_DUE);
      await hires.create({ ownerId: booking.ownerId, workerId: booking.workerId, businessName: booking.businessName, bookingId, demo: booking.demo, at: now() }, viewer.uid);
      return { due: false, offered: true, whatsappUrl: messageUrl(booking) };
    },
  };
}

export type HireService = ReturnType<typeof createHireService>;
