import { Band } from "@/components/ui/Band";
import { COST } from "./homeContent";
import { SectionHeading } from "./SectionHeading";


/** 05: what it costs, in one sentence and a band of hard numbers. */
export function CostSection() {
  return (
    <Band tone="paper" wide>
      <section id="what-it-costs" aria-labelledby="cost" className="reveal flex scroll-mt-20 flex-col gap-8">
        <SectionHeading id="cost" number="05" title={COST.title} />
        <p className="max-w-2xl text-base lg:text-xl">{COST.sentence}</p>
        <dl className="grid gap-6 border-t border-line pt-6 sm:grid-cols-3">
          {COST.numbers.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="order-2 text-sm text-muted">{item.label}</dt>
              <dd className="order-1 text-title font-semibold tabular-nums lg:text-title-lg">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Band>
  );
}
