import Link from "next/link";
import { ShiftSlip } from "@/components/ShiftSlip";
import { buttonClass } from "@/components/ui/Button";
import { HERO } from "./homeContent";

/** 01: the promise, the two ways in, three facts, and the example slip, which carries the one load animation. */
export function HomeHero() {
  return (
    <section aria-labelledby="hero" className="bg-paper px-5 py-12 lg:py-24">
      <div className="mx-auto flex max-w-md flex-col gap-10 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex flex-col gap-6">
          <h1 id="hero" className="text-hero text-balance lg:text-hero-lg">
            {HERO.title}
          </h1>
          <p className="text-base text-muted lg:text-xl">{HERO.intro}</p>
          <ul aria-label="At a glance" className="flex flex-wrap gap-2">
            {HERO.chips.map((chip) => (
              <li key={chip} className="border border-line px-2 py-1 text-micro font-semibold">
                {chip}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/work?intent=work" className={buttonClass("primary")}>
              Find a paid tryout
            </Link>
            <Link href="/business?intent=business" className={buttonClass("secondary")}>
              Post a tryout
            </Link>
          </div>
          <Link href="/sign-in#demo" className="self-start text-sm">
            <span className="link">{HERO.demo}</span>
          </Link>
        </div>
        <figure className="flex flex-col gap-2 pt-6">
          <div className="load-sequence">
            <ShiftSlip day="Saturday" hours="9:00 to 15:00" business="Sipho's Phone Repairs" area="Randburg" distance="from Ivory Park" payCents={21000} returnFareCents={5600} stamp="Booked" />
          </div>
          <figcaption className="text-sm text-muted">Example tryout</figcaption>
        </figure>
      </div>
    </section>
  );
}
