import { describe, expect, it } from "vitest";
import type { BookingRecord } from "@/domain/bookings";
import { canAddEvidence, decideEvidence, evidencePath, sniffImage } from "@/domain/evidence";
import { fromSast } from "@/domain/time";

const owner = { uid: "sipho", demo: false };
const worker = { uid: "thabo", demo: false };
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const GIF = new TextEncoder().encode("GIF89a......");

const booking = (overrides: Partial<BookingRecord> = {}): BookingRecord => ({
  tryoutId: "t1", ownerId: "sipho", workerId: "thabo", demo: false, title: "Phone shop helper", businessName: "Sipho's Phone Repairs", businessArea: "Randburg",
  location: { latitude: -26.0939, longitude: 28.0071, accuracyMetres: 15 }, workerFirstName: "Thabo", workerArea: "Ivory Park", workerPayoutPhone: "27821234567", workerIdLastFour: "0087",
  startAt: fromSast(2026, 10, 27, 9, 0), endAt: fromSast(2026, 10, 27, 15, 0), hours: 6, rateCentsPerHour: 3500, payCents: 21000, status: "ended", bookedAt: fromSast(2026, 10, 25, 18, 0),
  owedCents: 21000, payment: { state: "not_received", method: "ewallet", amountCents: 21000 }, ...overrides,
});

describe("what a file really is", () => {
  it("reads JPEG, PNG and WebP from their first bytes, and nothing else", () => {
    expect(sniffImage(JPEG)).toBe("image/jpeg");
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(WEBP)).toBe("image/webp");
    expect(sniffImage(GIF)).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
  });
});

describe("proof, only in a dispute", () => {
  it("lets each side add one screenshot after Not received", () => {
    expect(decideEvidence(worker, booking(), PNG)).toEqual({ kind: "add", party: "young_person", contentType: "image/png" });
    expect(decideEvidence(owner, booking(), JPEG)).toEqual({ kind: "add", party: "business", contentType: "image/jpeg" });
    expect(decideEvidence(worker, booking({ evidenceBy: ["young_person"] }), PNG)).toEqual({ kind: "refuse", problem: "already_added" });
    expect(canAddEvidence("business", booking({ evidenceBy: ["young_person"] }))).toBe(true);
  });

  it("is never asked for in the normal flow: before Not received, or after Received", () => {
    for (const state of ["awaiting_payment", "awaiting_confirmation", "received"] as const) {
      expect(decideEvidence(worker, booking({ payment: { state } }), PNG)).toEqual({ kind: "refuse", problem: "not_disputed" });
      expect(canAddEvidence("young_person", booking({ payment: { state } }))).toBe(false);
    }
  });

  it("refuses a stranger as not found, anything that isn't an image, and anything 2 MB or more", () => {
    expect(decideEvidence({ uid: "lerato", demo: false }, booking(), PNG)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideEvidence(worker, null, PNG)).toEqual({ kind: "refuse", problem: "not_found" });
    expect(decideEvidence(worker, booking(), GIF)).toEqual({ kind: "refuse", problem: "not_an_image" });
    const big = new Uint8Array(2 * 1024 * 1024);
    big.set(PNG);
    expect(decideEvidence(worker, booking(), big)).toEqual({ kind: "refuse", problem: "too_big" });
  });

  it("builds a private path from the booking and the side, never from the request", () => {
    expect(evidencePath("booking-1", "young_person", "abc")).toBe("evidence/booking-1/young_person-abc");
  });
});
