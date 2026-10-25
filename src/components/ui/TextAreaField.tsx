import type { TextareaHTMLAttributes } from "react";
import { FormError } from "./FormError";

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className" | "aria-describedby" | "aria-invalid"> {
  id: string;
  label: string;
  /** One plain sentence under the label. */
  hint?: string;
  error?: string | null;
}

/** A labelled text area, styled and wired like TextField: hint and error linked by aria-describedby. */
export function TextAreaField({ id, label, hint, error, rows = 3, ...props }: TextAreaFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div data-field={id} className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <textarea
        {...props}
        id={id}
        rows={rows}
        aria-describedby={hint ? `${hintId} ${errorId}` : errorId}
        aria-invalid={error ? true : undefined}
        className="w-full resize-y border-2 border-edge bg-paper px-3 py-2 text-lg text-ink placeholder:text-muted aria-invalid:border-stop aria-invalid:focus-visible:outline-stop aria-invalid:focus-visible:outline-offset-0"
      />
      <FormError id={errorId} message={error} />
    </div>
  );
}
