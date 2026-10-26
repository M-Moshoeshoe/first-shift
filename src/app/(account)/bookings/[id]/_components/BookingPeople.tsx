"use client";

import { useRef } from "react";
import { PersonPhoto } from "@/components/PersonPhoto";
import { Collapsible } from "@/components/ui/Collapsible";
import { Sheet } from "@/components/ui/Sheet";
import { RULES } from "@/config/rules";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { addMinutes, sastSlot, sastWhen } from "@/domain/time";
import type { BookingViewResponse } from "@/schemas/booking";

/** When check-in opens, as the owner reads it: "8:00 on Tue 27 Oct". */
const opensAt = (startAt: string): string => sastWhen(addMinutes(new Date(startAt), -RULES.checkInOpensMinutesBefore));

/**
 * Who's on the other side of the booking, as one compact row: their photo,
 * name and the one fact that matters today, with View details opening a
 * sheet with the rest. For the young person, the owner they'll meet; for the
 * owner while booked, what happens at the door, folded. For both, what the
 * First Shift team decided on anything looked into.
 */
export function BookingPeople({ booking }: { booking: BookingViewResponse }) {
  const sheet = useRef<HTMLDialogElement>(null);
  const isOwner = booking.party === "business";
  const other = isOwner ? booking.workerFirstName : booking.businessName;
  // The young person's one fact: who to ask for at the door, while there is a door to go to.
  const fact = isOwner ? (booking.payoutPhone ? `${BOOKING_COPY.payoutPhone}: ${booking.payoutPhone}` : null) : booking.owner && booking.status === "booked" ? BOOKING_COPY.meet(booking.owner.firstName) : booking.businessArea;
  return (
    <>
      <section aria-label={other} className="flex items-center gap-3 border border-line p-3">
        <PersonPhoto subject={booking.photo.subject} kind={booking.photo.kind} alt="" size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-base font-bold">{other}</h2>
          {fact ? <p className="text-sm text-muted tabular-nums">{fact}</p> : null}
        </div>
        <button type="button" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()} className="min-h-11 shrink-0 text-sm font-semibold">
          <span className="link">{BOOKING_COPY.viewDetails}</span>
        </button>
      </section>
      <Sheet sheetRef={sheet} title={other}>
        <div className="flex gap-4">
          <PersonPhoto subject={booking.photo.subject} kind={booking.photo.kind} alt={other} />
          {isOwner && booking.payoutPhone ? (
            <p className="text-base tabular-nums">
              {BOOKING_COPY.payoutPhone}: {booking.payoutPhone}
            </p>
          ) : (
            <p className="text-base">{booking.businessArea}</p>
          )}
        </div>
        {booking.owner ? (
          // The young person's view: who they'll meet, so they know who to ask for at the door.
          <div className="flex gap-4 border-t border-line pt-4">
            <PersonPhoto subject={booking.owner.subject} kind="profile" alt={booking.owner.firstName} />
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold">{BOOKING_COPY.ownerTitle(booking.owner.firstName)}</h3>
              <p className="text-sm text-muted">{BOOKING_COPY.ownerHint}</p>
            </div>
          </div>
        ) : null}
      </Sheet>
      {booking.reviews.map((review) => (
        // Both sides see what the First Shift team decided on anything looked into about this booking.
        <p key={review.at} className="border border-line p-4 text-base">
          {BOOKING_COPY.reviewed(sastSlot(new Date(review.at), new Date(review.at)).day, review.outcome)}
        </p>
      ))}
      {isOwner && booking.status === "booked" ? (
        <Collapsible title={BOOKING_COPY.ownerNextTitle} open={false} boxed>
          {BOOKING_COPY.ownerNext(booking.workerFirstName, booking.day.canCheckIn ? null : opensAt(booking.startAt)).map((line) => (
            <p key={line} className="text-base">
              {line}
            </p>
          ))}
        </Collapsible>
      ) : null}
    </>
  );
}
