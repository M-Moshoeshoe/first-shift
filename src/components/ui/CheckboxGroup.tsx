import { FormError } from "./FormError";

export interface CheckboxOption<T extends string> {
  value: T;
  label: string;
}

interface CheckboxGroupProps<T extends string> {
  id: string;
  legend: string;
  options: readonly CheckboxOption<T>[];
  values: readonly T[];
  onChange: (values: T[]) => void;
  hint?: string;
  error?: string | null;
}

/**
 * A fieldset of square checkboxes. The real input stays in the DOM, visually
 * hidden, so keyboards and screen readers use it as normal. A square box and
 * tick are drawn beside it, and focus shows on the whole row.
 */
export function CheckboxGroup<T extends string>({ id, legend, options, values, onChange, hint, error }: CheckboxGroupProps<T>) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // Rebuilt from the options so the chosen values keep the order shown on screen.
  const toggle = (value: T, checked: boolean) =>
    onChange(options.map((option) => option.value).filter((v) => (v === value ? checked : values.includes(v))));

  return (
    <fieldset aria-describedby={hint ? `${hintId} ${errorId}` : errorId} className="flex flex-col gap-1">
      <legend className="mb-1 font-bold">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {options.map((option) => {
        const optionId = `${id}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className="relative flex min-h-11 items-center gap-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink"
          >
            <input
              id={optionId}
              type="checkbox"
              name={id}
              value={option.value}
              checked={values.includes(option.value)}
              onChange={(event) => toggle(option.value, event.target.checked)}
              className="peer sr-only"
            />
            <span aria-hidden="true" className="size-6 shrink-0 border-2 border-edge bg-paper peer-checked:border-ink peer-checked:bg-ink" />
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-1/2 left-0 hidden size-6 -translate-y-1/2 text-paper peer-checked:block"
            >
              <path d="M6 12l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
            </svg>
            <span className="text-lg">{option.label}</span>
          </label>
        );
      })}
      <FormError id={errorId} message={error} />
    </fieldset>
  );
}
