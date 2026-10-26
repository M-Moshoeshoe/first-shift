import { describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/domain/bookings";
import type { ReviewCase } from "@/domain/cases";
import type { HireOfferRecord } from "@/domain/hire";
import type { ReferenceRecord } from "@/domain/references";
import { fromSast } from "@/domain/time";
import { AppError } from "@/server/errors";
import type { HireRepository } from "@/server/repositories/hireRepository";
import type { ReferenceRepository } from "@/server/repositories/referenceRepository";
import type { CaseContext, ResolveWrite, ReviewRepository } from "@/server/repositories/reviewRepository";
import { createHireService } from "@/server/services/hireService";
import { createReferenceService } from "@/server/services/referenceService";
import { createReviewService } from "@/server/services/reviewService";

const thabo = { uid: "thabo", demo: false };
const sipho = { uid: "sipho", demo: false };
const ANSWERS = { onTime: true, didTheWork: true, wouldHireAgain: true };
const booking = (overrides: Partial<BookingRecord> = {}): BookingRecord => ({
  tryoutId: "t1", ownerId: "sipho", workerId: "thabo", demo: false, title: "Phone shop helper", businessName: "Sipho's Phone Repairs", businessArea: "Randburg",
  location: { latitude: -26.0939, longitude: 28.0071, accuracyMetres: 15 }, workerFirstName: "Thabo", workerArea: "Ivory Park", workerPayoutPhone: "27821234567", workerIdLastFour: "0087",
  startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0), hours: 6, rateCentsPerHour: 3500, payCents: 21000, status: "ended", bookedAt: fromSast(2026, 10, 25, 18, 0),
  owedCents: 21000, ended: { at: fromSast(2026, 10, 27, 15, 0), reason: "completed", minutesWorked: 360, answers: ANSWERS }, payment: { state: "received" }, ownerFirstName: "Sipho", ownerPhone: "27831234567", ...overrides,
});

function referenceFakes(stored: BookingRecord = booking()) {
  const references = new Map<string, ReferenceRecord>();
  const cases: ReviewCase[] = [];
  const audit: string[] = [];
  let token: string | null = null;
  const repo: ReferenceRepository = {
    async forBooking(id) {
      return { booking: id === "b1" ? structuredClone(stored) : null, reference: structuredClone(references.get(id) ?? null), tasks: ["Greet customers"] };
    },
    async create(id, reference) {
      if (!references.has(id)) {
        references.set(id, structuredClone(reference));
        audit.push("reference_drafted");
      }
      return structuredClone(references.get(id) ?? reference);
    },
    async transactDecide(id, _actor, plan) {
      const { write, result } = plan(structuredClone(references.get(id) ?? null));
      const current = references.get(id);
      if (write && current) {
        references.set(id, { ...current, status: write.status });
        if (write.review) cases.push(write.review);
        audit.push(write.audit);
      }
      return result;
    },
    async workerRecord() {
      return { firstName: "Thabo", bookings: [{ id: "b1", booking: structuredClone(stored) }], references: new Map(references) };
    },
    async shareToken(_uid, fresh) {
      token ??= fresh;
      return token;
    },
    async byShareToken(candidate) {
      return candidate === token ? "thabo" : null;
    },
  };
  const writeReference = vi.fn(async () => "They arrived on time and did the work.");
  const consumeQuota = vi.fn(async () => undefined);
  const service = createReferenceService({ references: repo, writeReference, consumeQuota, aiDailyLimit: 30, newToken: () => "abcdefghijklmnopqrstuvwx" });
  return { service, references, cases, audit, writeReference, consumeQuota };
}

describe("references and the work record", () => {
  it("writes the reference once after Received, from the answers and tasks only, within the daily AI limit", async () => {
    const { service, writeReference, consumeQuota, audit } = referenceFakes();
    expect((await service.view(thabo, "b1")).canWrite).toBe(true);
    expect(await service.draft(thabo, "b1")).toEqual({ status: "written" });
    expect(await service.draft(thabo, "b1")).toEqual({ status: "unchanged" });
    expect(writeReference).toHaveBeenCalledOnce();
    expect(writeReference).toHaveBeenCalledWith(ANSWERS, ["Greet customers"]);
    expect(consumeQuota).toHaveBeenCalledWith("thabo", "ai", 30, expect.anything());
    expect(audit).toEqual(["reference_drafted"]);
    expect(await service.view(thabo, "b1")).toMatchObject({ party: "young_person", canWrite: false, reference: { status: "draft", answers: ANSWERS } });
  });

  it("is never written before Received, never by the owner, and the owner sees only their own answers", async () => {
    const early = referenceFakes(booking({ payment: { state: "awaiting_confirmation" } }));
    await expect(early.service.draft(thabo, "b1")).rejects.toMatchObject({ code: "not_received" });
    expect(early.writeReference).not.toHaveBeenCalled();
    const { service } = referenceFakes();
    await expect(service.draft(sipho, "b1")).rejects.toMatchObject({ status: 404 });
    expect(await service.view(sipho, "b1")).toEqual({ party: "business", answers: ANSWERS, reference: null, canWrite: false });
  });

  it("adds it to the record on approval, opens a review on a challenge, and shares approved content only", async () => {
    const { service } = referenceFakes();
    await service.draft(thabo, "b1");
    expect((await service.shared("abcdefghijklmnopqrstuvwx"))).toBeNull();
    const mine = await service.record(thabo);
    expect(mine.shareToken).toBe("abcdefghijklmnopqrstuvwx");
    expect((await service.shared(mine.shareToken))?.entries[0]?.reference).toBeNull();
    expect(await service.decide(thabo, "b1", { action: "approve" })).toEqual({ status: "done" });
    expect((await service.shared(mine.shareToken))?.entries[0]?.reference?.text).toBe("They arrived on time and did the work.");
    expect(await service.shared("not-a-token")).toBeNull();
    const other = referenceFakes();
    await other.service.draft(thabo, "b1");
    await other.service.decide(thabo, "b1", { action: "challenge", reason: "I was on time but it says otherwise" });
    expect(other.cases).toMatchObject([{ kind: "reference_challenge", referenceId: "b1", workerId: "thabo" }]);
    await expect(other.service.decide(sipho, "b1", { action: "approve" })).rejects.toBeInstanceOf(AppError);
  });
});

describe("job offers", () => {
  function hireFakes(completed: number) {
    const offers: HireOfferRecord[] = [];
    const hires: HireRepository = {
      async pair() {
        return { completed, slots: [], offered: offers.length > 0 };
      },
      async create(offer) {
        if (offers.length > 0) return "exists";
        offers.push(offer);
        return "created";
      },
      async forWorker() {
        return offers;
      },
    };
    const service = createHireService({ hires, bookings: { get: async (id) => (id === "b1" ? { booking: booking(), secrets: { checkInCode: "1", shareToken: "x", expiresAt: new Date() } } : null) }, now: () => fromSast(2026, 10, 27, 16, 0) });
    return { service, offers };
  }

  it("offers a job after three tryouts together, once, with a WhatsApp message the owner sends", async () => {
    const { service, offers } = hireFakes(3);
    expect(await service.view(sipho, "b1")).toEqual({ due: true, offered: false, whatsappUrl: null });
    const offered = await service.offer(sipho, "b1");
    expect(offered).toMatchObject({ offered: true });
    expect(decodeURIComponent(offered.whatsappUrl ?? "")).toContain("Hi Thabo, it's Sipho from Sipho's Phone Repairs.");
    expect(offered.whatsappUrl?.startsWith("https://wa.me/27821234567?text=")).toBe(true);
    expect(await service.offer(sipho, "b1")).toMatchObject({ offered: true });
    expect(offers).toHaveLength(1);
  });

  it("isn't due before then, and is the owner's alone", async () => {
    const { service } = hireFakes(1);
    await expect(service.offer(sipho, "b1")).rejects.toMatchObject({ code: "not_due" });
    await expect(service.view(thabo, "b1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("resolving a case", () => {
  const open: ReviewCase = { kind: "booking_review", reason: "not_received", bookingId: "b1", businessId: "sipho", workerId: "thabo", status: "open" };
  function reviewFakes(item: ReviewCase = open) {
    const writes: ResolveWrite[] = [];
    const context: CaseContext = { id: "c1", item, openedAt: new Date(), demo: false, bookingId: "b1", booking: booking(), parties: { businessId: "sipho", workerId: "thabo" }, users: {}, businesses: {}, reference: null, evidence: [], history: [], strikes: [] };
    const reviews: ReviewRepository = {
      async open() {
        return [context];
      },
      async context(id) {
        return id === "c1" ? structuredClone(context) : null;
      },
      async transactResolve(_id, plan) {
        const { write, result } = plan(structuredClone(context));
        if (write) {
          writes.push(write);
          context.item = { ...context.item, status: "closed" };
        }
        return result;
      },
    };
    const grant = vi.fn(async () => undefined);
    return { service: createReviewService({ reviews, grant }), writes, grant };
  }

  it("resolves with an outcome and the reasoning, and turns each action into an audited change", async () => {
    const { service, writes } = reviewFakes();
    const resolution = { outcome: "Paid late, now confirmed", reason: "Bank screenshot shows R210 at 18:02", admin: "mokhachane", actions: [{ kind: "unpause" as const, party: "business" as const }, { kind: "strike" as const, party: "business" as const, reason: "false_payment_claim" as const }] };
    expect(await service.resolve("c1", resolution)).toEqual({ closed: true, actions: 2 });
    expect(writes[0]).toMatchObject({ outcome: "Paid late, now confirmed", admin: "mokhachane", status: [{ uid: "sipho", to: "active" }], strikes: [{ uid: "sipho", reason: "false_payment_claim" }] });
    await expect(service.resolve("c1", resolution)).rejects.toMatchObject({ code: "closed" });
  });

  it("upholds a reference challenge by taking it off, and grants credits through the ledger", async () => {
    const challenge: ReviewCase = { kind: "reference_challenge", referenceId: "b1", workerId: "thabo", ownerId: "sipho", reason: "Not true", status: "open" };
    const { service, writes, grant } = reviewFakes(challenge);
    await service.resolve("c1", { outcome: "Upheld", reason: "Owner agreed it was wrong", admin: "mokhachane", actions: [{ kind: "reference", verdict: "uphold" }, { kind: "grant", amount: 2 }] });
    expect(writes[0]?.reference).toEqual({ id: "b1", status: "withdrawn" });
    expect(grant).toHaveBeenCalledWith("sipho", 2, "Owner agreed it was wrong", "mokhachane");
  });

  it("refuses without the reasoning, and lists open cases by priority", async () => {
    const { service, writes } = reviewFakes();
    await expect(service.resolve("c1", { outcome: "Done", reason: "", admin: "mokhachane", actions: [] })).rejects.toMatchObject({ code: "reason" });
    expect(writes).toHaveLength(0);
    expect((await service.list())[0]).toMatchObject({ id: "c1", priority: "payment" });
  });
});
