import { describe, expect, it } from "vitest";
import { nextPaymentState, paidOnTime, payDeadline, paymentAction, referenceAllowed } from "@/domain/paymentFlow";
import { addHours } from "@/domain/time";

const checkedOut = new Date("2026-10-24T15:00:00Z");

describe("payment confirmation", () => {
  it("moves from paid to received only through the right events", () => {
    expect(nextPaymentState("awaiting_payment", "owner_marked_paid")).toBe("awaiting_confirmation");
    expect(nextPaymentState("awaiting_confirmation", "worker_confirmed_received")).toBe("received");
    expect(nextPaymentState("awaiting_payment", "worker_confirmed_received")).toBeNull();
    expect(nextPaymentState("received", "worker_reported_not_received")).toBeNull();
  });

  it("issues a reference only after the young person confirms", () => {
    expect(referenceAllowed("awaiting_confirmation")).toBe(false);
    expect(referenceAllowed("received")).toBe(true);
  });

  describe("payment is due at check-out, by 23:59 SAST the same day", () => {
    // A tryout that ends at 18:00 SAST (16:00 UTC), the latest daylight allows.
    const endsAt1800 = new Date("2026-10-24T16:00:00Z");
    const sast = (time: string) => new Date(`${time}+02:00`);

    it("puts the deadline at midnight that night, South African time", () => {
      expect(payDeadline(endsAt1800)).toEqual(sast("2026-10-25T00:00:00"));
    });

    it("counts payment marked at 23:58 as on time, and at 00:01 as late", () => {
      expect(paidOnTime(endsAt1800, sast("2026-10-24T23:58:00"))).toBe(true);
      expect(paidOnTime(endsAt1800, sast("2026-10-24T23:59:59"))).toBe(true);
      expect(paidOnTime(endsAt1800, sast("2026-10-25T00:01:00"))).toBe(false);
    });

    it("leaves an unpaid owner alone until 23:59, and pauses them from 00:00", () => {
      expect(paymentAction("awaiting_payment", sast("2026-10-24T23:58:00"), endsAt1800)).toBe("none");
      expect(paymentAction("awaiting_payment", sast("2026-10-24T23:59:59"), endsAt1800)).toBe("none");
      expect(paymentAction("awaiting_payment", sast("2026-10-25T00:00:00"), endsAt1800)).toBe("pause_business");
      expect(paymentAction("awaiting_payment", sast("2026-10-25T00:01:00"), endsAt1800)).toBe("pause_business");
    });

    it("uses the South African day, not the UTC day", () => {
      // 00:30 SAST on the 25th is still the 24th in UTC; the deadline is the end of the 25th in South Africa.
      expect(payDeadline(new Date("2026-10-24T22:30:00Z"))).toEqual(sast("2026-10-26T00:00:00"));
    });
  });

  it("reminds at 24 hours and sends to review at 72 hours without confirmation", () => {
    const paidAt = addHours(checkedOut, 1);
    expect(paymentAction("awaiting_confirmation", addHours(paidAt, 25), checkedOut, paidAt)).toBe("remind_worker");
    expect(paymentAction("awaiting_confirmation", addHours(paidAt, 73), checkedOut, paidAt)).toBe("send_to_review");
    expect(paymentAction("not_received", checkedOut, checkedOut)).toBe("send_to_review");
  });
});
