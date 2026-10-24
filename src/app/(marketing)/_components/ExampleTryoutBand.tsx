import { ShiftSlip } from "@/components/ShiftSlip";
import { Band } from "@/components/ui/Band";
import { StartActions } from "./StartActions";

/** The example slip carries the product's one load animation (load-sequence in globals.css). */
export function ExampleTryoutBand() {
  return (
    <Band tone="mist">
      <div className="reveal flex flex-col gap-6">
        <figure className="flex flex-col gap-2">
          <div className="load-sequence">
            <ShiftSlip day="Saturday" hours="9:00 to 17:00" business="Sipho's Phone Repairs" area="Ivory Park" payCents={24184} returnFareCents={3600} stamp="Booked" />
          </div>
          <figcaption className="text-sm text-muted">Example tryout</figcaption>
        </figure>
        <StartActions />
      </div>
    </Band>
  );
}
