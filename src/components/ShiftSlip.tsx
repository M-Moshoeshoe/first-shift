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
}

/** A tryout drawn as a shift slip: time on the gold stub, pay given the most weight. */
export function ShiftSlip({ day, hours, business, area, payCents, returnFareCents, stamp }: ShiftSlipProps) {
  return (
    <article className="relative flex border-2 border-ink bg-paper">
      <div className="flex w-24 shrink-0 flex-col justify-center border-r-2 border-dashed border-ink bg-gold px-3 py-4">
        <p className="text-sm font-semibold">{day}</p>
        <p className="text-sm">{hours}</p>
      </div>
      <div className="flex-1 px-4 py-4">
        <p className="text-2xl font-bold tracking-tight tabular-nums">{formatRand(payCents)}</p>
        <p className="mt-1 font-medium">{business}</p>
        <p className="text-sm text-muted tabular-nums">
          {area}
          {returnFareCents !== null ? `, return taxi ${formatRand(returnFareCents)}` : ""}
        </p>
      </div>
      {stamp ? (
        <span className="absolute -top-3 right-3">
          <Stamp label={stamp} />
        </span>
      ) : null}
    </article>
  );
}
