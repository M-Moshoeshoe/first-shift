import Link from "next/link";
import { FEED_COPY } from "@/domain/findingMessages";
import { formatRand } from "@/domain/money";
import { sastSlot } from "@/domain/time";
import type { FeedItemResponse } from "@/schemas/finding";

/**
 * A tryout in the feed, compact: the pay largest, then what and where, one
 * stat line, and the business's chips. The full slip waits on the detail
 * page, so a phone screen shows three or four tryouts at once.
 */
export function FeedCard({ item }: { item: FeedItemResponse }) {
  const { day, hours } = sastSlot(new Date(item.startAt), new Date(item.endAt));
  const fare = item.returnFareCents === null ? FEED_COPY.fareUnknown.toLowerCase() : `return taxi ${formatRand(item.returnFareCents)}`;
  return (
    <Link href={`/work/tryouts/${item.id}`} className="lift flex flex-col gap-1 border border-line bg-paper p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-bold tabular-nums">{formatRand(item.payCents)}</span>
        <span className="text-right text-sm font-semibold">
          {day}, {hours}
        </span>
      </span>
      <span className="text-base font-semibold">
        <span className="link">{item.title}</span>, {item.businessName}
      </span>
      <span className="text-sm text-muted tabular-nums">{[item.area, item.distance, fare].filter(Boolean).join(", ")}</span>
      <span className="flex flex-wrap gap-1.5 pt-1">
        {[item.injuryCover, item.payRecord].map((chip) => (
          <span key={chip} className="border border-line px-1.5 py-0.5 text-micro">
            {chip}
          </span>
        ))}
      </span>
    </Link>
  );
}
