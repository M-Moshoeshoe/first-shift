import { Band } from "@/components/ui/Band";
import { COST } from "./homeContent";
import { SectionHeading } from "./SectionHeading";


/** 05: what it costs, fees only, one line each. */
export function CostSection() {
  return (
    <Band tone="paper" wide>
      <section id="what-it-costs" aria-labelledby="cost" className="reveal flex scroll-mt-20 flex-col gap-8">
        <SectionHeading id="cost" number="05" title={COST.title} />
        <ul className="grid gap-3 sm:grid-cols-2">
          {COST.lines.map((line) => (
            <li key={line} className="border border-line bg-paper p-4 text-base font-semibold">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </Band>
  );
}
