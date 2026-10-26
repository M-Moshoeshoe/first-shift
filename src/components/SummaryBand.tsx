/** One figure on a dashboard: always a real count from the person's own data, never an estimate. */
export interface Figure {
  label: string;
  value: number;
}

/** The dashboard's summary: two or three real figures in one mist band, the numbers largest (docs/DESIGN.md, Containers). */
export function SummaryBand({ label, figures }: { label: string; figures: readonly Figure[] }) {
  return (
    <dl aria-label={label} className={`grid ${figures.length === 3 ? "grid-cols-3" : "grid-cols-2"} border border-line bg-mist`}>
      {figures.map((figure, index) => (
        <div key={figure.label} className={`flex flex-col-reverse justify-end gap-1 p-4 ${index > 0 ? "border-l border-line" : ""}`}>
          <dt className="text-sm text-muted">{figure.label}</dt>
          <dd className="text-title font-bold tabular-nums">{figure.value}</dd>
        </div>
      ))}
    </dl>
  );
}
