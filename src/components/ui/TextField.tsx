import type { InputHTMLAttributes } from "react";
import { FormError } from "./FormError";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "aria-describedby" | "aria-invalid"> {
  id: string;
  label: string;
  /** One plain sentence under the label, for example why we ask. */
  hint?: string;
  error?: string | null;
}

/** A labelled text input. The hint and the error slot are both linked by aria-describedby. */
export function TextField({ id, label, hint, error, ...inputProps }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div data-field={id} className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <input
        {...inputProps}
        id={id}
        aria-describedby={hint ? `${hintId} ${errorId}` : errorId}
        aria-invalid={error ? true : undefined}
        className="min-h-11 w-full border border-edge bg-paper px-3 text-[1rem] text-ink placeholder:text-muted aria-invalid:border-2 aria-invalid:border-stop aria-invalid:focus-visible:outline-stop aria-invalid:focus-visible:outline-offset-0"
      />
      <FormError id={errorId} message={error} />
    </div>
  );
}
