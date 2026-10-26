import { PersonPhoto } from "@/components/PersonPhoto";
import { RULES } from "@/config/rules";
import { BOOKING_COPY } from "@/domain/bookingMessages";
import { addMinutes, sastClock, sastSlot } from "@/domain/time";
import type { BookingViewResponse } from "@/schemas/booking";

/** When check-in opens, as the owner reads it: "8:00 on Tue 27 Oct". */
function opensAt(startAt: string): string {
  const opens = addMinutes(new Date(startAt), -RULES.checkInOpensMinutesBefore);
  return `${sastClock(opens)} on ${sastSlot(opens, opens).day}`;
}

/**
 * Who's on the other side of the booking, with their photo. For the young
 * person, also the owner they'll meet at the door; for the owner, while
 * booked, what happens at the door.
 */
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
      {isOwner && booking.status === "booked" ? (
        <section aria-labelledby="next-heading" className="flex flex-col gap-2">
          <h2 id="next-heading" className="text-xl font-bold">
            {BOOKING_COPY.ownerNextTitle}
          </h2>
          {BOOKING_COPY.ownerNext(booking.workerFirstName, opensAt(booking.startAt)).map((line) => (
            <p key={line} className="text-lg">
              {line}
            </p>
          ))}
        </section>
      ) : null}
    </>
  );
}
