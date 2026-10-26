import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { OWNER_COPY } from "@/domain/bookingMessages";

/** Once someone is booked: who, what happens next, and the way to the booking, instead of the list of applicants. */
export function BookedPanel({ bookingId, name }: { bookingId: string; name: string | null }) {
  return (
    <section aria-labelledby="booked-heading" className="flex flex-col gap-3">
      <h2 id="booked-heading" className="text-xl font-bold">
        {name ? OWNER_COPY.booked(name) : OWNER_COPY.bookedNoName}
      </h2>
      <p className="text-base">{OWNER_COPY.bookedNext}</p>
      <Link href={`/bookings/${bookingId}`} className={buttonClass("primary")}>
        {OWNER_COPY.seeBooking}
      </Link>
    </section>
  );
}
