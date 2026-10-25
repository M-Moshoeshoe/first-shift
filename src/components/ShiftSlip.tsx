import type { ReactNode } from "react";
import { formatRand } from "@/domain/money";
import { Stamp, type StampLabel } from "./ui/Stamp";

interface ShiftSlipProps {
  day: string;
  hours: string;
  business: string;
  area: string;
  payCents: number;
  returnFareCents: number | null;
  stamp?: StampLabel;
  /** A row under the slip's details, such as the owner's status line and actions. */
  footer?: ReactNode;
}

/** A tryout drawn as a shift slip: time on the gold stub, pay given the most weight. */
export function ShiftSlip({ day, hours, business, area, payCents, returnFareCents, stamp, footer }: ShiftSlipProps) {
  return (
    <article className="relative border-2 border-ink bg-paper">
      <div className="flex">
        <div className="flex w-28 shrink-0 flex-col justify-center border-r-2 border-dashed border-ink bg-gold px-3 py-4 lg:w-32">
          <p className="text-sm font-bold">{day}</p>
          <p className="text-sm">{hours}</p>
        </div>
        <div className="flex-1 px-4 py-4">
          <p className="text-2xl font-bold tabular-nums">{formatRand(payCents)}</p>
          <p className="mt-1">{business}</p>
          <p className="text-sm text-muted tabular-nums">
            {area}
            {/* The fare wraps as one piece, so the amount never sits on a line without its label. */}
            {returnFareCents !== null ? (
              <>
                , <span className="whitespace-nowrap">return taxi {formatRand(returnFareCents)}</span>
              </>
            ) : null}
          </p>
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
