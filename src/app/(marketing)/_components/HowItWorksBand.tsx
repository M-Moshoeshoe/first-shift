import type { CSSProperties } from "react";
import { Band } from "@/components/ui/Band";

const steps = ["A business near you posts a paid tryout.", "You do the work and get paid that day.", "The business writes your reference."];

/** Each step reveals through its own slice of the list's scroll range, so they arrive in order. */
export function HowItWorksBand() {
  return (
    <Band tone="paper">
      <section aria-labelledby="how-it-works" className="reveal">
        <h2 id="how-it-works" className="text-xl font-bold">
          How it works
        </h2>
        <ol className="reveal-steps mt-3 flex flex-col gap-2">
          {steps.map((step, index) => (
            <li key={step} className="reveal-step flex gap-3" style={{ "--step": index } as CSSProperties}>
              <span className="font-bold">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </Band>
  );
}
