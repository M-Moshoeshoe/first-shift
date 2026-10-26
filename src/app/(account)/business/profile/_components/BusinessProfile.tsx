"use client";

import { PersonPhoto } from "@/components/PersonPhoto";
import { SavedSummary } from "@/components/SavedSummary";
import { PageTitle } from "@/components/ui/PageTitle";
import { SUPPORT_EMAIL } from "@/config/contact";
import { COIDA_OPTION_LABELS } from "@/domain/injuryCover";
import { LOCATION_COPY, pinPrecisionText } from "@/domain/messages";
import { useAuth } from "@/lib/auth/useAuth";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";

const present = (rows: readonly { term: string; value: string | undefined }[]) => rows.flatMap((row) => (row.value ? [{ term: row.term, value: row.value }] : []));

/**
 * The business's saved details and its owner's, read-only: what young people
 * see, and what the First Shift team keeps, with the saved shopfront and face
 * photos themselves. Changes go through support, so a business can't be
 * swapped for another behind its record.
 */
export function BusinessProfile() {
  const { business } = useGatedProfile();
  const uid = useAuth().user?.uid;
  const heading = useHeadingFocus(true);
  const owner = business?.owner;
  const shop = present([
    { term: "Name", value: business?.name },
    { term: "Area", value: business?.area },
    { term: "Opening hours", value: business?.openingHours },
    { term: "Your shop's location", value: business?.location ? pinPrecisionText(business.location.accuracyMetres) : LOCATION_COPY.notPinned },
    { term: "Registered with the Compensation Fund (COIDA)", value: business?.coida ? COIDA_OPTION_LABELS[business.coida] : undefined },
  ]);
  const you = present([
    { term: "Full name", value: owner?.legalName },
    { term: "ID number", value: owner?.idLastFour ? `Ending in ${owner.idLastFour}` : undefined },
    { term: "Contact number", value: owner?.phone },
    { term: "CIPC registration", value: owner?.cipc },
  ]);
  // Your own photos, which the server always shows you (bookings.ts, mayViewPhoto).
  const shopfront = uid && business?.hasPhoto ? <PersonPhoto subject={uid} kind="shopfront" alt="Your shopfront photo" /> : null;
  const face = uid && owner?.hasPhoto ? <PersonPhoto subject={uid} kind="profile" alt="Your face photo" /> : null;
  return (
    <>
      <PageTitle headingRef={heading} title="Your business" intro="What young people see when they book you, and what we keep private." />
      <SavedSummary id="business-saved" title="The business" rows={shop} photo={shopfront} />
      <SavedSummary id="owner-saved" title="You, the owner" rows={you} photo={face} />
      <p className="text-base">
        To change any of these, email us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </>
  );
}
