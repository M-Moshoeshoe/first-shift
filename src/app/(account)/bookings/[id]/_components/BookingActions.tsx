"use client";

import { buttonClass } from "@/components/ui/Button";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { whatsAppUrl } from "@/domain/bookings";
import type { BookingViewResponse } from "@/schemas/booking";

/**
 * Each side's tools for the day. The owner: the payment line and a WhatsApp
 * chat with the young person. The young person: the check-in code to show at
 * the door, a WhatsApp chat with the owner, and a trip to share with someone they trust.
 */
export function BookingActions({ booking, when }: { booking: BookingViewResponse; when: string }) {
  if (booking.party === "business") {
    return (
      <section aria-labelledby="pay-line" className="flex flex-col gap-3">
        <p id="pay-line" className="text-lg">
          {BOOKING_COPY.payment}
        </p>
        {booking.whatsappUrl ? (
          <a href={booking.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
            {BOOKING_COPY.chat}
          </a>
        ) : null}
      </section>
    );
  }
  // Built here, from this page's own address, so the link always points at the site the young person is using.
  const statusLink = booking.shareToken && typeof window !== "undefined" ? `${window.location.origin}/status/${booking.shareToken}` : null;
  return (
    <section aria-labelledby="code-heading" className="flex flex-col gap-3">
      {booking.checkInCode ? (
        <div className="flex flex-col gap-2 border-2 border-ink p-4">
          <h2 id="code-heading" className="text-xl font-bold">
            {BOOKING_COPY.code}
          </h2>
          <p className="text-4xl font-bold tracking-title tabular-nums">{`${booking.checkInCode.slice(0, 3)} ${booking.checkInCode.slice(3)}`}</p>
          <p className="text-sm text-muted">{BOOKING_COPY.codeHint}</p>
        </div>
      ) : null}
      <p className="text-lg">{BOOKING_COPY.chatHint(booking.owner?.firstName ?? booking.businessName)}</p>
      {booking.whatsappUrl ? (
        <a href={booking.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
          {BOOKING_COPY.chat}
        </a>
      ) : null}
      {statusLink ? (
        <div className="flex flex-col gap-2">
          <a href={whatsAppUrl("", BOOKING_COPY.shareText(booking.businessName, booking.businessArea, when, statusLink))} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
            {BOOKING_COPY.share}
          </a>
          <p className="text-sm text-muted">{BOOKING_COPY.shareHint}</p>
        </div>
      ) : null}
    </section>
  );
}
