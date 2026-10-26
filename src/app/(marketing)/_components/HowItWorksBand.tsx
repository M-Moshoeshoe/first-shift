import type { CSSProperties } from "react";
import { Band } from "@/components/ui/Band";

const steps = ["A business near you posts a paid tryout.", "You do the work and get paid that day.", "The business writes your reference."];

/** Each step reveals through its own slice of the list's scroll range, so they arrive in order. */
export function HowItWorksBand() {
  return (
    <Band tone="paper" lgTone="mist" wide>
      <section aria-labelledby="how-it-works" className="reveal flex flex-col gap-2">
        <h2 id="how-it-works" className="text-xl font-bold">
          How it works
        </h2>
        <ol className="reveal-steps flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:gap-12">
          {steps.map((step, index) => (
            <li key={step} className="reveal-step flex gap-2" style={{ "--step": index } as CSSProperties}>
              <span className="font-semibold">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </Band>
  );
}
