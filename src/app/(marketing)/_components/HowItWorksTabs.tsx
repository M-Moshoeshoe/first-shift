"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { OnView } from "@/components/OnView";
import { ShiftSlip } from "@/components/ShiftSlip";
import { HOW } from "./homeContent";
import { ScenePhoto } from "./ScenePhoto";
import { SCENES } from "./scenes";

const SIDES = [HOW.young, HOW.business] as const;
const PAID_SLIP = { day: "Saturday", hours: "9:00 to 15:00", business: "Sipho's Phone Repairs", area: "Randburg", payCents: 21000 } as const;

/**
 * The two sides of a tryout, four numbered steps each. Side by side on a
 * desktop; tabs on a phone (arrow keys move between them, as tabs should).
 */
export function HowItWorksTabs() {
  const [selected, setSelected] = useState(0);
  // "For businesses" in the menu links to #for-businesses: open that tab, then scroll to it, since a hidden tab panel can't be scrolled to.
  useEffect(() => {
    const follow = () => {
      const index = SIDES.findIndex((side) => `#${side.id}` === window.location.hash);
      if (index < 0) return;
      setSelected(index);
      requestAnimationFrame(() => document.getElementById(SIDES[index]?.id ?? "")?.scrollIntoView({ block: "start" }));
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = selected === 0 ? 1 : 0;
    setSelected(next);
    document.getElementById(`tab-${SIDES[next]?.id}`)?.focus();
  };
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Who it's for" onKeyDown={onKeyDown} className="flex border-b border-line lg:hidden">
        {SIDES.map((side, index) => (
          <button
            key={side.id}
            id={`tab-${side.id}`}
            type="button"
            role="tab"
            aria-selected={selected === index}
            aria-controls={side.id}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            className="-mb-px min-h-11 flex-1 border-b-2 border-transparent text-sm font-semibold text-muted aria-selected:border-ink aria-selected:text-ink"
          >
            {side.title}
          </button>
        ))}
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-16">
        {SIDES.map((side, index) => (
          <section key={side.id} id={side.id} role="tabpanel" aria-labelledby={`tab-${side.id}`} className={`flex scroll-mt-20 flex-col gap-4 ${selected === index ? "" : "hidden lg:flex"}`}>
            <h3 className="hidden text-xl lg:block">{side.title}</h3>
            {side.id === HOW.business.id ? <ScenePhoto scene={SCENES.tailor} sizes="(min-width: 1024px) 34rem, 100vw" className="aspect-3/2" /> : null}
            <ol className="flex flex-col gap-3">
              {side.steps.map((step, number) => (
                <li key={step} className="flex gap-4 border border-line p-4">
                  <span aria-hidden="true" className="w-6 shrink-0 text-sm font-semibold text-muted tabular-nums">
                    {String(number + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-4 text-base">
                    {step}
                    {/* The young person's last step ends with the money: a small slip whose Paid Stamp lands as it comes into view. */}
                    {side.id === HOW.young.id && number === side.steps.length - 1 ? (
                      <div className="max-w-xs pt-6">
                        <OnView before={<ShiftSlip {...PAID_SLIP} />} later={<ShiftSlip {...PAID_SLIP} stamp="Paid" />} />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
