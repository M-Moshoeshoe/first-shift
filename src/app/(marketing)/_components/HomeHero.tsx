import Link from "next/link";
import { OnView } from "@/components/OnView";
import { ShiftSlip } from "@/components/ShiftSlip";
import { buttonClass } from "@/components/ui/Button";
import { HERO } from "./homeContent";
import { ScenePhoto } from "./ScenePhoto";
import { SCENES } from "./scenes";

const HERO_SLIP = { day: "Saturday", hours: "9:00 to 15:00", business: "Sipho's Phone Repairs", area: "Randburg", distance: "from Ivory Park", payCents: 21000, returnFareCents: 5600 } as const;

/** The promise, the two ways in, three facts, and the example slip, which carries the one load animation. */
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
        {/* From 1024 px the slip sits over a photo of real street trade; on a phone the photo is left out, so the first screen is text and the slip. */}
        <figure className="flex flex-col gap-2 pt-6 lg:relative lg:pt-0 lg:pb-32">
          <ScenePhoto scene={SCENES.stalls} sizes="(min-width: 1024px) 36rem, 1px" className="hidden aspect-3/2 lg:block" />
          <div className="load-sequence lg:absolute lg:bottom-8 lg:-left-8 lg:w-96">
            {/* On a phone the slip sits below the fold, so its Booked Stamp waits until it is seen. */}
            <OnView before={<ShiftSlip {...HERO_SLIP} />} later={<ShiftSlip {...HERO_SLIP} stamp="Booked" />} />
          </div>
          <figcaption className="text-sm text-muted lg:absolute lg:bottom-0 lg:-left-8">Example tryout</figcaption>
        </figure>
      </div>
    </section>
  );
}
