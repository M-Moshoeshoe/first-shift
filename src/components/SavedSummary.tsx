interface SavedSummaryProps {
  id: string;
  title?: string;
  rows: readonly { term: string; value: string }[];
}

/** What's already saved, so a person who comes back sees it and only what's left to do. Used by both onboarding forms. */
export function SavedSummary({ id, title = "Your details are saved", rows }: SavedSummaryProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-2 border-ink p-4">
      <h3 id={id} className="font-bold">
        {title}
      </h3>
      <dl className="flex flex-col gap-1 text-sm">
        {rows.map((row) => (
          <div key={row.term} className="flex flex-wrap gap-x-2">
            <dt className="text-muted">{row.term}:</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
