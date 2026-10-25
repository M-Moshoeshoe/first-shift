import { applicationId, type ApplicationRecord } from "@/domain/applications";
import type { CoidaAnswer } from "@/domain/injuryCover";
import { coarseLocation } from "@/domain/geo";
import type { TryoutWindow } from "@/domain/schedule";
import type { TryoutRecord } from "@/domain/tryoutDecisions";
import type { UserRecord } from "@/domain/profile";
import { AppError } from "@/server/errors";
import type { ApplicationAuditAction, FindingRepository } from "@/server/repositories/findingRepository";
import { createFindingService } from "@/server/services/findingService";
import { createFakeStore } from "./profileFakes";

// Monday 26 October 2026, 08:00 in Johannesburg.
export const NOW = new Date("2026-10-26T06:00:00Z");

export const thabo: UserRecord = {
  role: "young_person",
  status: "active",
  completed: 0,
  onTime: 0,
  lateCancellations: 0,
  noShows: 0,
  firstName: "Thabo",
  area: "Ivory Park",
  availability: ["saturdays"],
  payoutPhone: "27821234567",
  payMethods: ["ewallet", "cash"],
  idLastFour: "0087",
  residency: "citizen",
  profilePhoto: { path: "photos/thabo/profile.jpg", version: "1" },
};

/** A published tryout tomorrow 09:00 to 15:00, at a pin in the given place. */
export function tryoutAt(lat: number, lng: number, overrides: Partial<TryoutRecord> = {}): TryoutRecord {
  return {
    ownerId: "sipho",
    businessName: "Sipho's Phone Repairs",
    area: "Midrand",
    shopfrontPhoto: "photos/sipho/shopfront.jpg",
    location: coarseLocation(lat, lng),
    title: "Phone shop helper",
    tasks: ["Greet customers"],
    category: "customer_service",
    startAt: new Date("2026-10-27T07:00:00Z"),
    endAt: new Date("2026-10-27T13:00:00Z"),
    hours: 6,
    rateCentsPerHour: 3500,
    payCents: 21000,
    status: "published",
    demo: false,
    ...overrides,
  };
}

/** In memory, with the same all-or-nothing transaction contract as Firestore. */
export function createFindingFakes() {
  const store = createFakeStore();
  store.users.set("thabo", thabo);
  const tryouts = new Map<string, TryoutRecord>();
  const businesses = new Map<string, { completed: number; coida?: CoidaAnswer }>();
  const applications = new Map<string, ApplicationRecord>();
  const applicants = new Map<string, number>();
  const bookings = new Map<string, TryoutWindow[]>();
  const audit: { uid: string; action: ApplicationAuditAction; target: string }[] = [];
  const quota = new Map<string, number>();
  let rangeQueries = 0;

  const listing = (id: string) => {
    const tryout = tryouts.get(id);
    return tryout ? { id, tryout: structuredClone(tryout), business: businesses.get(tryout.ownerId) ?? { completed: 0 } } : null;
  };
  const state = (tryoutId: string, workerId: string) => ({
    tryout: tryouts.has(tryoutId) ? structuredClone(tryouts.get(tryoutId) ?? null) : null,
    application: structuredClone(applications.get(applicationId(tryoutId, workerId)) ?? null),
    bookings: structuredClone(bookings.get(workerId) ?? []),
  });

  const finding: FindingRepository = {
    async publishedIn(bounds, areas) {
      rangeQueries += bounds.length;
      // Like the queries: every published tryout whose cell falls in a range or whose area is listed, possibly more than once.
      const published = [...tryouts].filter(([, tryout]) => tryout.status === "published");
      const inRange = bounds.flatMap(([start, end]) => published.filter(([, tryout]) => tryout.location.geohash >= start && tryout.location.geohash <= end));
      const onRoute = published.filter(([, tryout]) => areas.includes(tryout.area));
      return [...inRange, ...onRoute].flatMap(([id]) => listing(id) ?? []);
    },
    async listing(id) {
      return listing(id);
    },
    async read(tryoutId, workerId) {
      return state(tryoutId, workerId);
    },
    async transact(tryoutId, workerId, plan) {
      // If plan throws, nothing below runs.
      const { write, result } = plan(state(tryoutId, workerId));
      if (write) {
        const id = applicationId(tryoutId, workerId);
        applications.set(id, structuredClone(write.application));
        applicants.set(tryoutId, (applicants.get(tryoutId) ?? 0) + write.applicantsDelta);
        audit.push({ uid: workerId, action: write.audit, target: id });
      }
      return result;
    },
  };

  const consumeQuota = async (uid: string, bucket: string, limit: number, { message }: { message: string }) => {
    const key = `${uid}_${bucket}`;
    const used = quota.get(key) ?? 0;
    if (used >= limit) throw new AppError(429, "daily_limit", message);
    quota.set(key, used + 1);
  };

  const service = createFindingService({ finding, profiles: store.repo, consumeQuota, now: () => NOW });
  return { store, tryouts, businesses, applications, applicants, bookings, audit, quota, service, rangeQueries: () => rangeQueries };
}
