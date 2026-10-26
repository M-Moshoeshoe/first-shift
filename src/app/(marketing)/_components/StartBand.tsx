import { Band } from "@/components/ui/Band";
import { RULES } from "@/config/rules";
import { formatRand } from "@/domain/money";
import { StartActions } from "./StartActions";

/** The closing band: what it costs, then the two actions again, for someone who has read to the end. */
export function StartBand() {
  return (
    <Band tone="paper" lgTone="mist" wide>
      <div className="reveal flex flex-col gap-6 lg:max-w-md">
        <section aria-labelledby="what-it-costs" className="flex flex-col gap-2">
          <h2 id="what-it-costs" className="text-xl font-bold">
            What it costs
          </h2>
          <p className="text-base">
            Free for young people. Businesses pay {formatRand(RULES.creditPriceCents)} for each completed tryout, and their first {RULES.freeCredits} are free.
          </p>
        </section>
        <StartActions />
      </div>
    </Band>
  );
}
