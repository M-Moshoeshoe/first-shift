"use client";

import { PersonPhoto } from "@/components/PersonPhoto";
import { RecordEntry } from "@/components/RecordEntry";
import { RecordJobs } from "@/components/RecordJobs";
import { SlipSkeleton } from "@/components/SlipSkeleton";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";
import { whatsAppUrl } from "@/domain/bookings";
import { cvText } from "@/domain/cvText";
import { RECORD_COPY } from "@/domain/recordCopy";
import { useApi } from "@/lib/useApi";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { RecordViewSchema, type RecordViewResponse } from "@/schemas/record";
import { CopyForCv } from "./CopyForCv";

type Reference = RecordViewResponse["entries"][number]["reference"];

/** Where a reference not yet on the record stands, in the young person's own view. */
const noteFor = (reference: Reference): string | undefined =>
  reference?.status === "draft" ? RECORD_COPY.draftWaiting : reference?.status === "challenged" ? RECORD_COPY.challengeOpen : undefined;

/** Every tryout the young person was paid for, confirmed by both, with each business's shopfront, the references they added, and a link to share it. */
export function WorkRecord() {
  const { resource, reload } = useApi("/api/record", RecordViewSchema, RECORD_COPY.unavailable);
  const heading = useHeadingFocus(resource.status === "ready");

  if (resource.status === "loading") {
    return (
      <div role="status" aria-label="Loading your record" className="flex flex-col gap-6">
        <div className="h-11 w-2/3 skeleton" />
        <SlipSkeleton />
      </div>
    );
  }
  if (resource.status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <FormError message={resource.message} />
        <Button variant="secondary" onClick={reload}>
          {BUTTON_LABELS.tryAgain}
        </Button>
      </div>
    );
  }

  const record = resource.data;
  // Built from this page's own address, so the link always points at the site the young person is using.
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/record/${record.shareToken}`;
  return (
    <>
      <PageTitle headingRef={heading} title={RECORD_COPY.title} intro={RECORD_COPY.intro} />
      {record.entries.length > 0 ? <CopyForCv text={cvText(record.entries.map((entry) => ({ ...entry, reference: entry.reference?.status === "approved" ? entry.reference : null })), record.jobs, link)} /> : null}
      {record.entries.length === 0 ? (
        <p className="text-base">{RECORD_COPY.empty}</p>
      ) : (
        <>
          <section aria-labelledby="share-record" className="flex flex-col gap-2 border border-line p-4">
            <h2 id="share-record" className="text-xl font-bold">
              {RECORD_COPY.share}
            </h2>
            <p className="text-sm text-muted">{RECORD_COPY.shareHint}</p>
            <a href={whatsAppUrl("", RECORD_COPY.shareText(link))} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              {RECORD_COPY.shareOnWhatsApp}
            </a>
            <p className="break-all text-sm">{link}</p>
          </section>
          <RecordJobs jobs={record.jobs} />
          <div className="flex flex-col gap-4">
            {record.entries.map((entry) => (
              <RecordEntry
                key={entry.bookingId}
                entry={{ ...entry, reference: entry.reference?.status === "approved" ? entry.reference : null }}
                note={noteFor(entry.reference)}
                // Decorative: the business's name is right beside it.
                photo={entry.photoSubject ? <PersonPhoto subject={entry.photoSubject} kind="shopfront" alt="" size="sm" /> : undefined}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
