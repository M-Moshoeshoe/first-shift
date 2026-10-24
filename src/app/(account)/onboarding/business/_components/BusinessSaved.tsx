import { LOCATION_COPY, pinPrecisionText } from "@/domain/messages";
import type { Location } from "@/domain/profile";
import type { BusinessDraft } from "./BusinessDetailsStep";

/** What's already saved, so an owner who comes back sees it and only what's left to do. */
export function BusinessSaved({ details, pin }: { details: BusinessDraft; pin: Location | null }) {
  const rows = [
    { term: "Business name", value: details.name },
    { term: "Area", value: details.area },
    { term: "Opening hours", value: details.openingHours },
    { term: "Premises pin", value: pin ? pinPrecisionText(pin.accuracyMetres) : LOCATION_COPY.notPinned },
  ];
  return (
    <section aria-labelledby="business-saved" className="flex flex-col gap-2 border-2 border-ink p-4">
      <h3 id="business-saved" className="font-bold">
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
