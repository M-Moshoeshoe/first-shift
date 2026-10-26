import { PersonPhoto } from "@/components/PersonPhoto";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import type { BookingViewResponse } from "@/schemas/booking";

/** Who's on the other side of the booking, with their photo; for the young person, also the owner they'll meet at the door. */
export function BookingPeople({ booking }: { booking: BookingViewResponse }) {
  const isOwner = booking.party === "business";
  const other = isOwner ? booking.workerFirstName : booking.businessName;
  return (
    <>
      <section aria-labelledby="who-heading" className="flex gap-4">
        <PersonPhoto subject={booking.photo.subject} kind={booking.photo.kind} alt={other} />
        <div className="flex flex-col gap-1">
          <h2 id="who-heading" className="text-xl font-bold">
            {other}
          </h2>
          {isOwner && booking.payoutPhone ? (
            <p className="text-lg tabular-nums">
              {BOOKING_COPY.payoutPhone}: {booking.payoutPhone}
            </p>
          ) : null}
        </div>
      </section>
      {booking.owner ? (
        // The young person's view: who they'll meet, so they know who to ask for at the door.
        <section aria-labelledby="owner-heading" className="flex gap-4">
          <PersonPhoto subject={booking.owner.subject} kind="profile" alt={booking.owner.firstName} />
          <div className="flex flex-col gap-1">
            <h2 id="owner-heading" className="text-xl font-bold">
              {BOOKING_COPY.ownerTitle(booking.owner.firstName)}
            </h2>
            <p className="text-sm text-muted">{BOOKING_COPY.ownerHint}</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
