import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DayPanel } from "@/app/(account)/bookings/[id]/_components/day/DayPanel";
import type { BookingViewResponse } from "@/schemas/booking";

/** The young person's booking once the owner has tapped Paid: what GET /api/bookings/[id] sends. */
const paidBy = (method: "ewallet" | "payshap" | "cash_send" | "cash", amountCents = 21000): BookingViewResponse => ({
  id: "booking-1", tryoutId: "t1", party: "young_person", title: "Phone shop helper", businessName: "Sipho's Phone Repairs", businessArea: "Randburg", workerFirstName: "Thabo",
  startAt: "2026-10-27T07:00:00.000Z", endAt: "2026-10-27T13:00:00.000Z", hours: 6, rateCentsPerHour: 3500, payCents: 21000, status: "ended",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=-26.0939,28.0071", pinAccuracyMetres: 15, photo: { subject: "sipho", kind: "shopfront" },
  payoutPhone: null, whatsappUrl: null, checkInCode: "482913", shareToken: "share-token-00000001", cancel: null,
  day: {
    canCheckIn: false, canNoShow: false, canReportNotOpen: false, canCheckOut: false, payable: true, checkedInAt: "2026-10-27T06:55:00.000Z", endReason: "completed",
    owedCents: 21000, owedMinimumCents: 21000, payment: { state: "awaiting_confirmation", method, amountCents, reference: method === "cash" ? null : "FS 27 OCT" },
    payMethods: ["ewallet", "payshap", "cash_send", "cash"], door: null, remind: false, evidence: { canAdd: false, sent: false },
  },
});

const render = (booking: BookingViewResponse) => renderToStaticMarkup(<DayPanel booking={booking} reload={() => undefined} />);

describe("the balance check, as the page renders it", () => {
  it("writes both FNB eWallet codes out exactly, asterisks and all, and each one dials", () => {
    const html = render(paidBy("ewallet"));
    expect(html).toContain("*120*277#");
    expect(html).toContain("*130*277#");
    expect(html).toContain('href="tel:*120*277%23"');
    expect(html).toContain('href="tel:*130*277%23"');
    expect(html).toContain("Payment reference: FS 27 OCT");
  });

  it("gives each other method its own check", () => {
    expect(render(paidBy("payshap"))).toContain("Check your banking app");
    expect(render(paidBy("cash_send"))).toContain("only real once an ATM or till pays it out");
    expect(render(paidBy("cash"))).toContain("Count the cash in person");
    expect(render(paidBy("cash"))).not.toContain("*120*277#");
  });

  it("says plainly that nothing is ever sent back, and an overpayment stays with the young person", () => {
    const html = render(paidBy("ewallet", 25000));
    expect(html).toContain("You don&#x27;t have to send anything back");
    expect(html).toContain("First Shift never asks you to send money back");
  });
});
