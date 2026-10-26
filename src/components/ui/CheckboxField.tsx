import { FormError } from "./FormError";

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
}

/**
 * One square checkbox and its label, drawn like CheckboxGroup's: the real
 * input stays in the DOM, visually hidden, and focus shows on the whole row.
 */
export function CheckboxField({ id, label, checked, onChange, error }: CheckboxFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div data-field={id} className="flex flex-col gap-2">
      <label htmlFor={id} className="relative flex min-h-11 items-center gap-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span aria-hidden="true" className="size-6 shrink-0 border border-edge bg-paper peer-checked:border-ink peer-checked:bg-ink peer-aria-invalid:border-stop" />
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-0 hidden size-6 -translate-y-1/2 text-paper peer-checked:block">
          <path d="M6 12l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
        </svg>
        <span className="text-base">{label}</span>
      </label>
      <FormError id={errorId} message={error} />
    </div>
  );
}
