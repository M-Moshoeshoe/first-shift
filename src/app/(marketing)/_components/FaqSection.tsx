import { Band } from "@/components/ui/Band";
import { FAQ } from "./homeContent";
import { SectionHeading } from "./SectionHeading";

/** The questions people ask, as native details and summary: no JavaScript. */
export function FaqSection() {
  return (
    <Band tone="mist" wide>
      <section aria-labelledby="faq" className="flex flex-col gap-6">
        <SectionHeading id="faq" title={FAQ.title} />
        <div className="flex max-w-3xl flex-col gap-2">
          {FAQ.items.map((item) => (
            // Native details and summary: open and close with no JavaScript, keyboard and screen reader ready.
            <details key={item.q} className="group border border-line bg-paper px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="text-xl leading-none group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="hidden text-xl leading-none group-open:inline">
                  −
                </span>
              </summary>
              <p className="pb-4 text-base text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Band>
  );
}
