import { FormError } from "@/components/ui/FormError";
import { HOUR_CHOICES } from "./checkForm";

interface HoursFieldProps {
  id: string;
  value: number;
  error?: string | null;
  onChange: (hours: number) => void;
}

/**
 * Hours as a row of square chips, 4 to 8. Real radio inputs, visually hidden,
 * so arrow keys and screen readers work as normal; the chosen chip is filled ink.
 */
export function HoursField({ id, value, error, onChange }: HoursFieldProps) {
  const errorId = `${id}-error`;
  return (
    <fieldset data-field={id} aria-describedby={errorId} className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">Hours</legend>
      <div className="flex gap-2">
        {HOUR_CHOICES.map((hours) => (
          <label key={hours} className="relative focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink">
            <input type="radio" name={id} value={hours} checked={value === hours} onChange={() => onChange(hours)} className="peer sr-only" />
            <span className="flex size-12 items-center justify-center border border-edge bg-paper text-base font-semibold text-ink tabular-nums peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
              {hours}
            </span>
          </label>
        ))}
      </div>
      <FormError id={errorId} message={error} />
    </fieldset>
  );
}
