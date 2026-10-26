import type { ReactNode } from "react";
import { FEED_COPY } from "@/domain/findingMessages";
import { formatRand } from "@/domain/money";
import { Stamp, type StampLabel } from "./ui/Stamp";

interface ShiftSlipProps {
  day: string;
  hours: string;
  business: string;
  area: string;
  payCents: number;
  /** The return minibus taxi fare; null says "Fare not known"; left out, no fare line at all (the owner's own slips). */
  returnFareCents?: number | null;
  /** "about 4 km" from the young person's area. */
  distance?: string | null;
  /** Further plain lines, such as the injury cover line. */
  notes?: readonly string[];
  /** The business's record for paying: "Paid on time: N of N" or "New on First Shift". */
  record?: string;
  stamp?: StampLabel;
  /** A row under the slip's details, such as the owner's status line and actions. */
  footer?: ReactNode;
}

const FARE_UNKNOWN = FEED_COPY.fareUnknown;

/** A tryout drawn as a shift slip: time on the gold stub, pay given the most weight. */
export function ShiftSlip({ day, hours, business, area, payCents, returnFareCents, distance, notes = [], record, stamp, footer }: ShiftSlipProps) {
  return (
    <article className="relative border-2 border-ink bg-paper">
      <div className="flex">
        <div className="flex w-28 shrink-0 flex-col justify-center border-r-2 border-dashed border-ink bg-gold px-3 py-3 lg:w-32">
          <p className="text-sm font-semibold">{day}</p>
          <p className="text-sm">{hours}</p>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          <p className="text-2xl font-bold tabular-nums">{formatRand(payCents)}</p>
          <p className="text-base font-semibold">{business}</p>
          {/* One stat line: where, how far, and the fare, which wraps as one piece so the amount never loses its label. */}
          <p className="text-sm text-muted tabular-nums">
            {area}
            {distance ? `, ${distance}` : null}
            {typeof returnFareCents === "number" ? (
              <>
                , <span className="whitespace-nowrap">return taxi {formatRand(returnFareCents)}</span>
              </>
            ) : null}
            {returnFareCents === null ? `, ${FARE_UNKNOWN.toLowerCase()}` : null}
          </p>
          {notes.length > 0 || record ? (
            <ul aria-label="About this business" className="flex flex-wrap gap-1.5 pt-1">
              {[...notes, ...(record ? [record] : [])].map((chip) => (
                <li key={chip} className="border border-line px-1.5 py-0.5 text-micro">
                  {chip}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      {footer ? <div className="border-t-2 border-ink px-4 py-2">{footer}</div> : null}
      {stamp ? (
        <span className="absolute -top-6 right-3">
          <Stamp label={stamp} />
        </span>
      ) : null}
    </article>
  );
}
