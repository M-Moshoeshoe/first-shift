"use client";

import { useState } from "react";
import { AiMark } from "@/components/AiMark";
import { AI_COPY } from "@/domain/tryoutMessages";

export interface DraftOption {
  title: string;
  tasks: readonly string[];
}

/**
 * The AI's versions as choices, a real radio group: the recommended one
 * first and chosen, with See another version revealing the one alternative.
 * Choosing fills the title and tasks below, which stay editable. Whatever is
 * posted is checked again on the server, edits included (human in the loop:
 * the model proposes, the owner chooses and edits, and the edited version is
 * what's checked).
 */
export function DraftOptions({ options, chosen, onChoose }: { options: readonly DraftOption[]; chosen: number; onChoose: (index: number) => void }) {
  const [showAll, setShowAll] = useState(chosen > 0);
  const shown = showAll ? options : options.slice(0, 1);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex flex-col gap-1">
        <span className="font-semibold">{showAll ? "Choose a version to start from" : "Recommended version"}</span>
        <AiMark>{AI_COPY.drafted}</AiMark>
      </legend>
      {shown.map((option, index) => (
        <label key={option.title} className="flex cursor-pointer gap-3 border border-line p-3 has-checked:border-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
          <input type="radio" name="draft-option" checked={chosen === index} onChange={() => onChoose(index)} className="mt-1 size-4 shrink-0 accent-ink" />
          <span className="flex flex-col gap-1">
            <span className="text-base font-semibold">{index === 0 ? `${option.title} (recommended)` : option.title}</span>
            <span className="text-sm text-muted">{option.tasks.join(". ")}</span>
          </span>
        </label>
      ))}
      {!showAll && options.length > 1 ? (
        <button type="button" onClick={() => setShowAll(true)} className="inline-flex min-h-11 items-center self-start text-sm font-semibold">
          <span className="link">See another version</span>
        </button>
      ) : null}
    </fieldset>
  );
}
