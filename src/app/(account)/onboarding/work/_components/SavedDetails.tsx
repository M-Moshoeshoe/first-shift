import { availabilityText } from "./availability";
import type { DetailsDraft } from "./DetailsStep";

/** What's already saved, so a person who comes back sees their details and only the photo left to do. */
export function SavedDetails({ details, idLastFour }: { details: DetailsDraft; idLastFour: string }) {
  const rows = [
    { term: "First name", value: details.firstName },
    { term: "Area", value: details.area },
    { term: "When you can work", value: availabilityText(details.availability) },
    { term: "Cellphone for payments", value: details.payoutPhone },
    { term: "ID number", value: `Ending in ${idLastFour}` },
  ];
  return (
    <section aria-labelledby="work-saved" className="flex flex-col gap-2 border-2 border-ink p-4">
      <h3 id="work-saved" className="font-bold">
        Your details are saved
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
