import Link from "next/link";
import { Band } from "@/components/ui/Band";
import { buttonClass } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { HomeHero } from "./_components/HomeHero";
import { HowItWorksTabs } from "./_components/HowItWorksTabs";
import { CLOSING, HOW, WHAT } from "./_components/homeContent";
import { CostSection } from "./_components/CostSection";
import { FaqSection } from "./_components/FaqSection";
import { SafetySection } from "./_components/SafetySection";
import { SectionHeading } from "./_components/SectionHeading";

/**
 * The home page, in sections (docs/DESIGN.md, v4): the hero, what a
 * tryout is, how it works for each side, safety, what it costs, and the
 * questions people ask. No live activity strip: there is none to show yet,
 * and the page never invents any. Tones alternate paper and mist.
 */
export default function HomePage() {
  return (
    <PageShell>
      <HomeHero />
      <Band tone="mist" wide>
        <section aria-labelledby="what" className="reveal flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-3">
            <SectionHeading id="what" title={WHAT.title} />
            <p className="text-base lg:text-xl">{WHAT.sentence}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {WHAT.facts.map((fact) => (
              <li key={fact} className="border border-line bg-paper p-4 text-base font-semibold">
                {fact}
              </li>
            ))}
          </ul>
        </section>
      </Band>
      <Band tone="paper" wide>
        <section id="how-it-works" aria-labelledby="how" className="flex scroll-mt-20 flex-col gap-8">
          <SectionHeading id="how" title={HOW.title} />
          <HowItWorksTabs />
        </section>
      </Band>
      <SafetySection />
      <CostSection />
      <FaqSection />
      <Band tone="paper" wide>
        <section aria-labelledby="closing" className="reveal flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="closing" className="text-title lg:text-title-lg">
            {CLOSING.title}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row lg:w-md">
            <Link href="/work?intent=work" className={buttonClass("primary")}>
              Find a paid tryout
            </Link>
            <Link href="/business?intent=business" className={buttonClass("secondary")}>
              Post a tryout
            </Link>
          </div>
        </section>
      </Band>
    </PageShell>
  );
}
