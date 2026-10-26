import { RECORD_COPY, REFERENCE_COPY } from "@/domain/recordCopy";
import type { OwnerAnswers } from "@/domain/references";
import { AnswerList } from "./AnswerList";

interface RecordEntryProps {
  entry: { businessName: string; businessArea: string; title: string; day: string; hours: number; reference: { text: string; answers: OwnerAnswers } | null };
  /** The young person's own view: a reference not yet added says where it stands. */
  note?: string;
}

/** One verified line on a work record: the tryout, confirmed paid by both sides, and its approved reference if there is one. */
export function RecordEntry({ entry, note }: RecordEntryProps) {
  return (
    <article className="flex flex-col gap-3 border-2 border-ink p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold">{entry.title}</h3>
        <p className="text-lg">
          {entry.businessName}, {entry.businessArea}
        </p>
        <p className="text-sm text-muted tabular-nums">
          {entry.day}, {RECORD_COPY.hours(entry.hours)}
        </p>
        <p className="font-bold text-go">{RECORD_COPY.verified}</p>
      </div>
      {entry.reference ? (
        <div className="flex flex-col gap-2 border-t-2 border-ink pt-3">
          <p className="text-sm font-bold">{REFERENCE_COPY.criteria}</p>
          <AnswerList answers={entry.reference.answers} />
          <p className="text-lg">{entry.reference.text}</p>
          <p className="text-sm text-muted">{REFERENCE_COPY.writtenWithAi}</p>
        </div>
      ) : null}
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </article>
  );
}
