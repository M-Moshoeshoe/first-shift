import "server-only";
import { rankApplicants } from "@/domain/applicantRanking";
import { applyState, bookingOpen, type ApplicationRecord, type ApplyState } from "@/domain/applications";
import { ANSWER_PROBLEM_MESSAGES, OFFER_PROBLEM_MESSAGES } from "@/domain/bookingMessages";
import { newBooking, statusExpiresAt } from "@/domain/bookings";
import type { Viewer } from "@/domain/demo";
import { decideAnswer, decideOffer, offerLapsesAt, openOffer, overlappingApplications } from "@/domain/offers";
import type { TryoutRecord } from "@/domain/tryoutDecisions";
import type { ApplicationsResponse, BadgesResponse, OwnerTryoutResponse } from "@/schemas/booking";
import { AppError } from "../errors";
import type { HireRepository } from "../repositories/hireRepository";
import type { OfferRepository } from "../repositories/offerRepository";
import type { ProfileRepository } from "../repositories/profileRepository";

export interface OfferServiceDeps {
  offers: OfferRepository;
  profiles: ProfileRepository;
  /** Job offers made to the young person, shown under Applications. */
  hires: Pick<HireRepository, "forWorker">;
  /** A fresh 6-digit check-in code and an unguessable share token, made outside the transaction so it stays pure. */
  newSecrets: () => { checkInCode: string; shareToken: string };
  now: () => Date;
}

const notFound = () => new AppError(404, "not_found", OFFER_PROBLEM_MESSAGES.not_found);

/** One line on the young person's Applications screen. A lapsed offer shows as ended. */
function applicationItem(application: ApplicationRecord, tryout: TryoutRecord, now: Date): ApplicationsResponse["items"][number] {
  const lapsed = application.status === "offered" && !openOffer(tryout, now);
  return {
    tryoutId: application.tryoutId,
    title: tryout.title,
    businessName: tryout.businessName,
    area: tryout.area,
    startAt: tryout.startAt.toISOString(),
    endAt: tryout.endAt.toISOString(),
    payCents: tryout.payCents,
    status: lapsed ? "offer_ended" : application.status,
    bookingId: application.status === "booked" ? (tryout.bookingId ?? null) : null,
  };
}

/**
 * The owner's tryout page, offers and their answers, the young person's
 * Applications screen, and the nav badges. Every decision comes from
 * src/domain (offers.ts, applications.ts); an accept writes the booking and
 * everything it changes in one repository transaction.
 */
export function createOfferService({ offers, profiles, hires, newSecrets, now }: OfferServiceDeps) {
  const role = async (uid: string) => (await profiles.transact(uid, null, (state) => ({ write: null, result: state }))).user?.role ?? null;

  return {
    async ownerTryout(viewer: Viewer, tryoutId: string): Promise<OwnerTryoutResponse> {
      const tryout = await offers.tryout(tryoutId);
      if (!tryout || tryout.ownerId !== viewer.uid) throw notFound();
      const applicants = rankApplicants(tryout, await offers.applicants(tryoutId));
      const pending = openOffer(tryout, now());
      const offeredTo = pending ? (applicants.find((applicant) => applicant.workerId === pending.workerId)?.firstName ?? "") : null;
      return {
        tryout: { id: tryoutId, title: tryout.title, area: tryout.area, startAt: tryout.startAt.toISOString(), endAt: tryout.endAt.toISOString(), payCents: tryout.payCents, status: tryout.status },
        offer: pending && offeredTo !== null ? { workerId: pending.workerId, firstName: offeredTo, lapsesAt: offerLapsesAt(tryout).toISOString() } : null,
        bookingId: tryout.status === "booked" ? (tryout.bookingId ?? null) : null,
        canOffer: bookingOpen(tryout, now()) && !pending,
        applicants,
      };
    },

    async markSeen(viewer: Viewer, tryoutId: string): Promise<void> {
      await offers.markSeen(tryoutId, viewer.uid);
    },

    async offer(viewer: Viewer, tryoutId: string, workerId: string): Promise<{ status: "offered" | "unchanged" }> {
      return offers.transactOffer<{ status: "offered" | "unchanged" }>(tryoutId, workerId, ({ tryout, application }) => {
        const decision = decideOffer(viewer, tryout, application, now());
        if (decision.kind === "refuse") throw new AppError(decision.problem === "not_found" ? 404 : 409, decision.problem, OFFER_PROBLEM_MESSAGES[decision.problem]);
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged" } };
        return { write: { at: now() }, result: { status: "offered" } };
      });
    },

    /** The young person accepts (a booking) or declines. Their new state comes back, so the page shows it at once. */
    async answer(viewer: Viewer, tryoutId: string, answer: "accept" | "decline"): Promise<{ status: "booked" | "declined" | "unchanged"; state: ApplyState }> {
      const secrets = newSecrets();
      return offers.transactAnswer<{ status: "booked" | "declined" | "unchanged"; state: ApplyState }>(tryoutId, viewer.uid, (state) => {
        const at = now();
        const decision = decideAnswer(viewer, { ...state, now: at }, answer);
        if (decision.kind === "refuse") throw new AppError(decision.problem === "not_found" ? 404 : 409, decision.problem, ANSWER_PROBLEM_MESSAGES[decision.problem]);
        const { tryout } = state;
        if (!tryout) throw notFound();
        if (decision.kind === "unchanged") return { write: null, result: { status: "unchanged", state: applyState({ worker: state.worker, tryout, application: state.application, bookings: [], now: at }) } };
        if (decision.kind === "decline") return { write: { kind: "decline" }, result: { status: "declined", state: { kind: "can_apply" } } };

        const booking = newBooking(tryoutId, tryout, state.business, viewer.uid, state.worker, at);
        // A complete profile on both sides always has what a booking needs; anything missing is a broken record.
        if (!booking) throw new Error("booking_profile_incomplete");
        const window = { start: tryout.startAt, end: tryout.endAt };
        const write = {
          kind: "accept" as const,
          booking,
          secrets: { ...secrets, expiresAt: statusExpiresAt(booking) },
          hold: decision.hold,
          withdraw: overlappingApplications(state.workerApplications, window, tryoutId),
          notSelected: state.tryoutApplications.filter((other) => other.status === "applied" || other.status === "offered"),
        };
        return { write, result: { status: "booked", state: { kind: "booked", bookingId: state.newBookingId } } };
      });
    },

    async applications(viewer: Viewer): Promise<ApplicationsResponse> {
      const [items, jobOffers] = await Promise.all([offers.workerApplications(viewer.uid), hires.forWorker(viewer.uid)]);
      return {
        items: items.flatMap(({ application, tryout }) => {
          if (!tryout) return [];
          return [applicationItem(application, tryout, now())];
        }),
        jobOffers: jobOffers.map((offer) => ({ businessName: offer.businessName, at: offer.at.toISOString() })),
      };
    },

    /** New applicants for an owner; offers waiting for a young person. */
    async badges(viewer: Viewer): Promise<BadgesResponse> {
      const who = await role(viewer.uid);
      if (!who) return { count: 0 };
      const inputs = await offers.badgeInputs(viewer.uid, who);
      const at = now();
      if (who === "young_person") {
        // An offered application carries the tryout's times, so a lapsed offer drops off without reading the tryout.
        return { count: inputs.filter((application) => at <= offerLapsesAt(application)).length };
      }
      // Only applicants to tryouts still taking bookings: one withdrawn since doesn't need the owner's attention.
      const ids = [...new Set(inputs.map((application) => application.tryoutId))];
      const live = new Set((await Promise.all(ids.map(async (id) => ({ id, tryout: await offers.tryout(id) })))).filter(({ tryout }) => tryout && bookingOpen(tryout, at)).map(({ id }) => id));
      return { count: inputs.filter((application) => live.has(application.tryoutId)).length };
    },
  };
}

export type OfferService = ReturnType<typeof createOfferService>;
