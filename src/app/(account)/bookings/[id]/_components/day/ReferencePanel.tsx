"use client";

import { useEffect, useRef, useState } from "react";
import { AnswerList } from "@/components/AnswerList";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { REFERENCE_COPY } from "@/domain/recordCopy";
import { ApiError, apiPost } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { DraftResultSchema, ReferenceViewSchema } from "@/schemas/record";
import { ReferenceReview } from "./ReferenceReview";

/**
 * After Received. The young person: the reference, written as soon as this
 * opens (and again from "Write my reference" if the AI didn't answer), then
 * their review. The owner: their own answers, read-only, since nobody can
 * rewrite a reference once it's written.
 */
export function ReferencePanel({ bookingId }: { bookingId: string }) {
  const path = `/api/bookings/${encodeURIComponent(bookingId)}/reference`;
  const { resource, reload } = useApi(path, ReferenceViewSchema, REFERENCE_COPY.loadFailed);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);
  const view = resource.status === "ready" ? resource.data : null;

  const write = async () => {
    setWriting(true);
    setError(null);
    try {
      await apiPost(path, {}, DraftResultSchema);
      reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : REFERENCE_COPY.writeFailed);
    }
    setWriting(false);
  };

  // Once, as soon as the young person opens the booking after Received.
  useEffect(() => {
    if (!view?.canWrite || tried.current) return;
    tried.current = true;
    void write();
  });

  if (!view) return resource.status === "error" ? <FormError message={resource.message} /> : <div role="status" aria-label={REFERENCE_COPY.writing} className="h-32 skeleton" />;
  if (view.party === "business") {
    if (!view.answers) return null;
    return (
      <section aria-labelledby="answers-heading" className="flex flex-col gap-2 border border-line p-4">
        <h2 id="answers-heading" className="text-xl font-bold">
          {REFERENCE_COPY.answersTitle}
        </h2>
        <AnswerList answers={view.answers} />
        <p className="text-sm text-muted">{REFERENCE_COPY.ownerNote}</p>
      </section>
    );
  }
  return (
    <section aria-labelledby="reference-heading" className="flex flex-col gap-3 border border-line p-4">
      <h2 id="reference-heading" className="text-xl font-bold">
        {REFERENCE_COPY.title}
      </h2>
      {view.withdrawn ? <p className="text-base">{REFERENCE_COPY.withdrawn}</p> : null}
      {view.reference ? <ReferenceReview bookingId={bookingId} reference={view.reference} done={reload} /> : null}
      {!view.reference && !view.withdrawn ? (
        <>
          <p className="text-base">{writing ? REFERENCE_COPY.writing : view.canWrite ? REFERENCE_COPY.notYet : REFERENCE_COPY.notYetWaiting}</p>
          {view.canWrite && !writing ? (
            <Button variant="secondary" onClick={() => void write()}>
              {REFERENCE_COPY.write}
            </Button>
          ) : null}
          <FormError message={error} />
        </>
      ) : null}
    </section>
  );
}
