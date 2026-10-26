"use client";

export interface DraftOption {
  title: string;
  tasks: readonly string[];
}

/**
 * The AI's versions as choices, a real radio group: choosing one fills the
 * title and tasks below, which stay editable. Whatever is posted is checked
 * again on the server, edits included (human in the loop: the model
 * proposes, the owner chooses and edits, and the edited version is what's checked).
 */
export function DraftOptions({ options, chosen, onChoose }: { options: readonly DraftOption[]; chosen: number; onChoose: (index: number) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">Choose a version to start from</legend>
      {options.map((option, index) => (
        <label key={option.title} className="lift flex cursor-pointer gap-3 border border-line p-3 has-checked:border-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
          <input type="radio" name="draft-option" checked={chosen === index} onChange={() => onChoose(index)} className="mt-1 size-4 shrink-0 accent-ink" />
          <span className="flex flex-col gap-1">
            <span className="text-base font-semibold">{option.title}</span>
            <span className="text-sm text-muted">{option.tasks.join(". ")}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
