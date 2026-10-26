"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RecordEntry } from "@/components/RecordEntry";
import { RecordJobs } from "@/components/RecordJobs";
import { PageTitle } from "@/components/ui/PageTitle";
import { RECORD_COPY } from "@/domain/recordCopy";
import { fetchSharedRecord } from "@/lib/fetchSharedRecord";
import type { SharedRecordResponse } from "@/schemas/sharedRecord";

/** The first name and every verified tryout, with the references the young person approved. Read fresh on every visit. */
export function SharedRecordView() {
  const { token } = useParams<{ token: string }>();
  const [record, setRecord] = useState<SharedRecordResponse | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    void fetchSharedRecord(token).then((next) => current && setRecord(next));
    return () => {
      current = false;
    };
  }, [token]);

  if (record === undefined) return <div role="status" aria-label="Loading the record" className="h-48 animate-skeleton bg-mist" />;
  if (record === null) return <PageTitle title={RECORD_COPY.metaTitle} intro={RECORD_COPY.publicMissing} />;
  return (
    <>
      <PageTitle title={RECORD_COPY.publicTitle(record.firstName)} intro={RECORD_COPY.publicIntro} />
      <RecordJobs jobs={record.jobs} />
      <div className="flex flex-col gap-4">
        {record.entries.map((entry, index) => (
          <RecordEntry key={`${entry.day}-${index}`} entry={entry} />
        ))}
      </div>
    </>
  );
}
