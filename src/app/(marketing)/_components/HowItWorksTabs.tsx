"use client";

import { useState, type KeyboardEvent } from "react";
import { HOW } from "./homeContent";

const SIDES = [HOW.young, HOW.business] as const;

/**
 * 03: the two sides of a tryout, four numbered steps each. Side by side on a
 * desktop; tabs on a phone (arrow keys move between them, as tabs should).
 */
export function HowItWorksTabs() {
  const [selected, setSelected] = useState(0);
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
            <ol className="flex flex-col gap-4">
              {side.steps.map((step, number) => (
                <li key={step} className="flex gap-4 border-t border-line pt-4">
                  <span aria-hidden="true" className="w-6 shrink-0 text-sm font-semibold text-muted tabular-nums">
                    {String(number + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
