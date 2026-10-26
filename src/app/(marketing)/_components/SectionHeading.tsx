/** A home page section's heading, the same size everywhere on the page. */
export function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="text-title lg:text-title-lg">
      {title}
    </h2>
  );
}
