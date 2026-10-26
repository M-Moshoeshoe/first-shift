import { Check, type LucideIcon } from "lucide-react";
import type { PlainBlock, PlainSection } from "./PlainPage";

function IconList({ icon: Icon, points }: { icon: LucideIcon; points: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-base">
      {points.map((point) => (
        <li key={point} className="flex gap-3">
          <Icon aria-hidden="true" size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function Block({ block, icon }: { block: PlainBlock; icon: LucideIcon }) {
  if (typeof block === "string") return <p className="text-base">{block}</p>;
  if ("points" in block) return <IconList icon={block.icon ?? icon} points={block.points} />;
  return <IconList icon={icon} points={block} />;
}

const blockKey = (block: PlainBlock): string => (typeof block === "string" ? block : "points" in block ? block.points.join("|") : block.join("|"));

/** One section of a public page as a card: its icon and heading, then paragraphs and icon lists. */
export function PlainSectionCard({ id, section }: { id: string; section: PlainSection }) {
  const { icon: Icon } = section;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-24 flex-col gap-3 border border-line p-4">
      <h2 id={`${id}-heading`} className="flex items-center gap-3 text-xl font-bold">
        <Icon aria-hidden="true" size={24} strokeWidth={1.75} className="shrink-0" />
        {section.heading}
      </h2>
      {section.body.map((block) => (
        // Points get a tick unless their list names its own icon.
        <Block key={blockKey(block)} block={block} icon={Check} />
      ))}
    </section>
  );
}
