import { describe, expect, it } from "vitest";
import { nextPaymentState, paymentAction, referenceAllowed } from "@/domain/paymentFlow";
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

  it("pauses an owner who hasn't marked paid within 24 hours", () => {
    expect(paymentAction("awaiting_payment", addHours(checkedOut, 23), checkedOut)).toBe("none");
    expect(paymentAction("awaiting_payment", addHours(checkedOut, 25), checkedOut)).toBe("pause_business");
  });

  it("reminds at 24 hours and sends to review at 72 hours without confirmation", () => {
    const paidAt = addHours(checkedOut, 1);
    expect(paymentAction("awaiting_confirmation", addHours(paidAt, 25), checkedOut, paidAt)).toBe("remind_worker");
    expect(paymentAction("awaiting_confirmation", addHours(paidAt, 73), checkedOut, paidAt)).toBe("send_to_review");
    expect(paymentAction("not_received", checkedOut, checkedOut)).toBe("send_to_review");
  });
});
