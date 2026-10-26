import { FormError } from "./FormError";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  id: string;
  legend: string;
  options: readonly RadioOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  hint?: string;
  error?: string | null;
}

/**
 * A fieldset of one-choice options, drawn like CheckboxGroup: the real radio
 * input stays in the DOM, visually hidden, beside a square box that fills
 * when chosen. Square, never a circle (docs/DESIGN.md, Shape).
 */
export function RadioGroup<T extends string>({ id, legend, options, value, onChange, hint, error }: RadioGroupProps<T>) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <fieldset id={id} data-field={id} aria-describedby={hint ? `${hintId} ${errorId}` : errorId} className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {options.map((option) => {
        const optionId = `${id}-${option.value}`;
        return (
          <label key={option.value} htmlFor={optionId} className="flex min-h-11 items-center gap-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink">
            <input id={optionId} type="radio" name={id} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="peer sr-only" />
            <span aria-hidden="true" className="size-6 shrink-0 border border-edge bg-paper p-1 peer-checked:border-ink peer-checked:[&>span]:block">
              <span className="hidden size-full bg-ink" />
            </span>
            <span className="text-base">{option.label}</span>
          </label>
        );
      })}
      <FormError id={errorId} message={error} />
    </fieldset>
  );
}
