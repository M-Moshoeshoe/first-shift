import Link from "next/link";
import { APPLICATION_LABELS, APPLICATIONS_COPY } from "@/domain/bookingMessages";
import { formatRand } from "@/domain/money";
import { sastSlot } from "@/domain/time";
import type { ApplicationsResponse } from "@/schemas/booking";

type Item = ApplicationsResponse["items"][number];

/** One application as a compact row: the business, the pay, when, and where it stands. It opens the tryout, or the booking once booked. */
export function ApplicationRow({ item }: { item: Item }) {
  const { day, hours } = sastSlot(new Date(item.startAt), new Date(item.endAt));
  const label = item.status === "offer_ended" ? APPLICATIONS_COPY.offerEnded : APPLICATION_LABELS[item.status];
  const href = item.bookingId ? `/bookings/${item.bookingId}` : `/work/tryouts/${item.tryoutId}`;
  const live = item.status === "offered" || item.status === "booked";
  return (
    <Link href={href} className="lift flex flex-col gap-1 border border-line bg-paper p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-base font-semibold">
          <span className="link">{item.businessName}</span>
        </span>
        <span className="text-xl font-bold tabular-nums">{formatRand(item.payCents)}</span>
      </span>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-muted">
          {day}, {hours}, {item.area}
        </span>
        <span className={`border px-1.5 py-0.5 text-micro font-semibold ${live ? "border-ink" : "border-line text-muted"}`}>{label}</span>
      </span>
    </Link>
  );
}
