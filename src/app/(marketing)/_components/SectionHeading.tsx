/** A home page section's heading, its number inline before the words (a figure, not an eyebrow label: AGENTS.md, Copy rules). */
export function SectionHeading({ id, number, title }: { id: string; number: string; title: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-3 text-title lg:text-title-lg">
      <span aria-hidden="true" className="text-sm font-semibold text-muted tabular-nums">
        {number}
      </span>
      {title}
    </h2>
  );
}
