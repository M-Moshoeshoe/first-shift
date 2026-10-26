import { Flag, IdCard, Share2, Sun, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Band } from "@/components/ui/Band";
import { SAFETY } from "./homeContent";
import { ScenePhoto } from "./ScenePhoto";
import { SCENES } from "./scenes";
import { SectionHeading } from "./SectionHeading";

// Server-rendered icons: plain SVG in the HTML, no JavaScript (docs/DESIGN.md, Icons).
const SAFETY_ICONS: Record<(typeof SAFETY.cards)[number]["icon"], LucideIcon> = { id: IdCard, daylight: Sun, share: Share2, report: Flag };

/** 04: four ways a tryout is kept safe, each a card, and the way to the full page. */
export function SafetySection() {
  return (
    <Band tone="mist" wide>
      <section aria-labelledby="safety" className="reveal flex flex-col gap-8">
        <SectionHeading id="safety" number="04" title={SAFETY.title} />
        <ScenePhoto scene={SCENES.corner} crop="band" sizes="(min-width: 1024px) 72rem, 100vw" className="aspect-8/3" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SAFETY.cards.map((card) => {
            const Icon = SAFETY_ICONS[card.icon];
            return (
              <li key={card.title} className="lift flex flex-col gap-2 border border-line bg-paper p-4">
                <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
                <h3 className="text-base">{card.title}</h3>
                <p className="text-sm text-muted">{card.text}</p>
              </li>
            );
          })}
        </ul>
        <Link href="/safety" className="self-start text-sm font-semibold">
          <span className="link">{SAFETY.more}</span>
        </Link>
      </section>
    </Band>
  );
}
