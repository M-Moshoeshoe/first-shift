import { ANSWER_ORDER, ANSWER_QUESTIONS, yesNo } from "@/domain/recordCopy";
import type { OwnerAnswers } from "@/domain/references";

/** The owner's three answers, as the fixed criteria a reference rests on. */
export function AnswerList({ answers }: { answers: OwnerAnswers }) {
  return (
    <dl className="flex flex-col gap-1">
      {ANSWER_ORDER.map((key) => (
        <div key={key} className="flex flex-wrap gap-x-2">
          <dt className="text-muted">{ANSWER_QUESTIONS[key]}</dt>
          <dd className="font-semibold">{yesNo(answers[key])}</dd>
        </div>
      ))}
    </dl>
  );
}
