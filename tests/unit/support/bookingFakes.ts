import { applicationId, type ApplicationRecord } from "@/domain/applications";
import type { BookingRecord } from "@/domain/bookings";
import type { ReviewCase } from "@/domain/cases";
import type { CreditEntry } from "@/domain/credits";
import type { TryoutRecord } from "@/domain/tryoutDecisions";
import type { BookingRepository } from "@/server/repositories/bookingRepository";
import type { BookingSecrets, OfferRepository } from "@/server/repositories/offerRepository";
import { createBookingService } from "@/server/services/bookingService";
import { createOfferService } from "@/server/services/offerService";
import { createFakeStore } from "./profileFakes";

/**
 * In memory, with the same all-or-nothing transaction contract as Firestore:
 * a plan reads copies, and only a returned write changes anything.
 */
export function createBookingFakes(now: () => Date) {
  const store = createFakeStore();
  const tryouts = new Map<string, TryoutRecord>();
  const applications = new Map<string, ApplicationRecord>();
  const bookings = new Map<string, BookingRecord>();
  const secrets = new Map<string, BookingSecrets>();
  const cases: ReviewCase[] = [];
  const strikes: { uid: string; reason: string }[] = [];
  const audit: string[] = [];

  const ledger = (uid: string): CreditEntry[] => store.ledgers.get(uid) ?? [];
  const appendLedger = (uid: string, entries: readonly CreditEntry[]) => store.ledgers.set(uid, [...ledger(uid), ...entries]);
  const updateApp = (app: Pick<ApplicationRecord, "tryoutId" | "workerId">, status: ApplicationRecord["status"]) => {
    const id = applicationId(app.tryoutId, app.workerId);
    const current = applications.get(id);
    if (current) applications.set(id, { ...current, status });
  };
  const updateTryout = (id: string, changes: Partial<TryoutRecord>) => {
    const current = tryouts.get(id);
    if (current) tryouts.set(id, { ...current, ...changes });
  };

  const shared: SharedState = { store, tryouts, applications, bookings, secrets, cases, strikes, audit, counter: { bookings: 0 }, ledger, appendLedger, updateApp, updateTryout };
  const offers = fakeOfferRepository(shared);
  const bookingRepo = fakeBookingRepository(shared);

  let secretCount = 0;
  const newSecrets = () => {
    secretCount += 1;
    return { checkInCode: String(100000 + secretCount), shareToken: `share-token-${String(secretCount).padStart(8, "0")}` };
  };
  const offerService = createOfferService({ offers, profiles: store.repo, newSecrets, now });
  const bookingService = createBookingService({ bookings: bookingRepo, photos: { metadata: async () => null, download: async () => null }, now });
  return { store, tryouts, applications, bookings, secrets, cases, strikes, audit, offerService, bookingService };
}

export type BookingFakes = ReturnType<typeof createBookingFakes>;

interface SharedState {
  store: ReturnType<typeof createFakeStore>;
  tryouts: Map<string, TryoutRecord>;
  applications: Map<string, ApplicationRecord>;
  bookings: Map<string, BookingRecord>;
  secrets: Map<string, BookingSecrets>;
  cases: ReviewCase[];
  strikes: { uid: string; reason: string }[];
  audit: string[];
  /** Bookings made so far, for their ids: booking-1, booking-2. */
  counter: { bookings: number };
  ledger: (uid: string) => CreditEntry[];
  appendLedger: (uid: string, entries: readonly CreditEntry[]) => void;
  updateApp: (app: Pick<ApplicationRecord, "tryoutId" | "workerId">, status: ApplicationRecord["status"]) => void;
  updateTryout: (id: string, changes: Partial<TryoutRecord>) => void;
}

/** The booking repository over the same in-memory state. */
function fakeBookingRepository({ store, applications, bookings, secrets, cases, strikes, audit, ledger, appendLedger, updateApp, updateTryout }: SharedState): BookingRepository {
  return {
    async get(id) {
      const booking = bookings.get(id);
      const secret = secrets.get(id);
      return booking && secret ? structuredClone({ booking, secrets: secret }) : null;
    },
    async graceCancelsSince(uid, since) {
      return [...bookings.values()].filter((b) => b.cancellation?.byUid === uid && b.cancellation.reliedOnGrace && b.cancellation.at >= since).length;
    },
    async transactEnding(id, actor, plan) {
      const booking = bookings.get(id) ?? null;
      const { write, result } = plan(structuredClone({ booking, ownerLedger: booking ? ledger(booking.ownerId) : [] }));
      if (!write || !booking) return result;
      bookings.set(id, { ...booking, ...write.booking });
      updateTryout(booking.tryoutId, { status: write.tryoutStatus });
      updateApp(booking, write.applicationStatus);
      appendLedger(booking.ownerId, write.ledger);
      if (write.strike) strikes.push({ uid: write.strike.party === "business" ? booking.ownerId : booking.workerId, reason: write.strike.reason });
      audit.push(write.audit);
      return result;
    },
    async report(reviewCase, _reporter, pauseBusiness) {
      cases.push(structuredClone(reviewCase));
      if (pauseBusiness && reviewCase.kind === "report") {
        const business = store.businesses.get(reviewCase.businessId);
        if (business) store.businesses.set(reviewCase.businessId, { ...business, status: "paused" });
      }
      return `case-${cases.length}`;
    },
    async byShareToken(token) {
      const id = [...secrets].find(([, secret]) => secret.shareToken === token)?.[0];
      return id ? structuredClone(bookings.get(id) ?? null) : null;
    },
    async relation(viewer, subject) {
      const apps = [...applications.values()];
      const all = [...bookings.values()];
      return {
        appliedToViewer: apps.some((app) => app.workerId === subject && app.ownerId === viewer),
        bookedTogether: all.some((b) => (b.ownerId === viewer && b.workerId === subject) || (b.ownerId === subject && b.workerId === viewer)),
      };
    },
  };
}

/** The offer repository over the same in-memory state. */
function fakeOfferRepository({ store, tryouts, applications, bookings, secrets, audit, counter, ledger, appendLedger, updateApp, updateTryout }: SharedState): OfferRepository {
  return {
    async tryout(id) {
      return structuredClone(tryouts.get(id) ?? null);
    },
    async applicants(tryoutId) {
      return [...applications.values()].filter((app) => app.tryoutId === tryoutId).flatMap((application) => {
        const worker = store.users.get(application.workerId);
        return worker ? [{ application: structuredClone(application), worker: structuredClone(worker), approvedReferences: 0 }] : [];
      });
    },
    async markSeen(tryoutId, ownerId) {
      for (const [id, app] of applications) if (app.tryoutId === tryoutId && app.ownerId === ownerId) applications.set(id, { ...app, seenByOwner: true });
    },
    async transactOffer(tryoutId, workerId, plan) {
      const { write, result } = plan(structuredClone({ tryout: tryouts.get(tryoutId) ?? null, application: applications.get(applicationId(tryoutId, workerId)) ?? null }));
      if (write) {
        updateTryout(tryoutId, { offer: { workerId, at: write.at } });
        updateApp({ tryoutId, workerId }, "offered");
        audit.push("offer_made");
      }
      return result;
    },
    async transactAnswer(tryoutId, workerId, plan) {
      const tryout = tryouts.get(tryoutId) ?? null;
      const ownerId = tryout?.ownerId ?? "";
      const own = [...bookings.values()].filter((b) => b.workerId === workerId);
      const state = structuredClone({
        tryout,
        application: applications.get(applicationId(tryoutId, workerId)) ?? null,
        ownerLedger: ledger(ownerId),
        workerBookings: own.filter((b) => b.status === "booked" || b.status === "checked_in").map((b) => ({ start: b.startAt, end: b.endAt })),
        pairSlots: own.filter((b) => b.ownerId === ownerId && b.status !== "cancelled" && b.status !== "no_show").map((b) => ({ startAt: b.startAt, hours: b.hours })),
        business: store.businesses.get(ownerId) ?? null,
        worker: store.users.get(workerId) ?? null,
        workerApplications: [...applications.values()].filter((app) => app.workerId === workerId),
        tryoutApplications: [...applications.values()].filter((app) => app.tryoutId === tryoutId && app.workerId !== workerId),
        newBookingId: `booking-${counter.bookings + 1}`,
      });
      const { write, result } = plan(state);
      if (!write) return result;
      if (write.kind === "decline") {
        updateApp({ tryoutId, workerId }, "declined");
        updateTryout(tryoutId, { offer: null });
        audit.push("offer_declined");
        return result;
      }
      counter.bookings += 1;
      bookings.set(state.newBookingId, structuredClone(write.booking));
      secrets.set(state.newBookingId, structuredClone(write.secrets));
      updateTryout(tryoutId, { status: "booked", bookingId: state.newBookingId, offer: null });
      updateApp({ tryoutId, workerId }, "booked");
      for (const other of write.notSelected) updateApp(other, "not_selected");
      for (const overlapping of write.withdraw) updateApp(overlapping, "withdrawn");
      appendLedger(ownerId, write.hold);
      audit.push("booking_made");
      return result;
    },
    async workerApplications(workerId) {
      return [...applications.values()].filter((app) => app.workerId === workerId).map((application) => ({ application: structuredClone(application), tryout: structuredClone(tryouts.get(application.tryoutId) ?? null) }));
    },
    async badgeInputs(uid, role) {
      return [...applications.values()].filter((app) => (role === "business" ? app.ownerId === uid && app.status === "applied" && app.seenByOwner === false : app.workerId === uid && app.status === "offered"));
    },
  };
}
