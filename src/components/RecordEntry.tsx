import type { ReactNode } from "react";
import { AiMark } from "@/components/AiMark";
import { RECORD_COPY, REFERENCE_COPY } from "@/domain/recordCopy";
import type { OwnerAnswers } from "@/domain/references";
import { AnswerList } from "./AnswerList";

interface RecordEntryProps {
  entry: { businessName: string; businessArea: string; title: string; day: string; hours: number; reference: { text: string; answers: OwnerAnswers; example?: boolean } | null };
  /** The young person's own view: a reference not yet added says where it stands. */
  note?: string;
  /**
   * The young person's own view: the business's shopfront, beside its name.
   * Passed in, never fetched here, so the public record page loads no sign-in code.
   */
  photo?: ReactNode;
}

/** One verified line on a work record: the tryout, confirmed paid by both sides, and its approved reference if there is one. */
export function RecordEntry({ entry, note, photo }: RecordEntryProps) {
  return (
    <article className="flex flex-col gap-3 border border-line p-4">
      <div className="flex gap-3">
        {photo}
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-xl font-bold">{entry.title}</h3>
          <p className="text-base">
            {entry.businessName}, {entry.businessArea}
          </p>
          <p className="text-sm text-muted tabular-nums">
            {entry.day}, {RECORD_COPY.hours(entry.hours)}
          </p>
          <p className="font-semibold text-go">{RECORD_COPY.verified}</p>
        </div>
      </div>
      {entry.reference ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-sm font-semibold">{REFERENCE_COPY.criteria}</p>
          <AnswerList answers={entry.reference.answers} />
          <p className="text-base">{entry.reference.text}</p>
          {entry.reference.example ? <p className="text-sm text-muted">{REFERENCE_COPY.example}</p> : <AiMark>{REFERENCE_COPY.writtenWithAi}</AiMark>}
        </div>
      ) : null}
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </article>
  );
}
