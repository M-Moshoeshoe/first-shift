import { Band } from "@/components/ui/Band";
import { StartActions } from "./StartActions";

/** The closing band: the two actions again, for someone who has read to the end. */
export function StartBand() {
  return (
    <Band tone="paper">
      <div className="reveal">
        <StartActions />
      </div>
    </Band>
  );
}
