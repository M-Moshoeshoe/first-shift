import type { Availability } from "@/domain/profile";

/** How each availability choice reads on screen, in the order the form shows them. */
export const AVAILABILITY_OPTIONS: readonly { value: Availability; label: string }[] = [
  { value: "weekday_mornings", label: "Weekday mornings" },
  { value: "weekday_afternoons", label: "Weekday afternoons" },
  { value: "saturdays", label: "Saturdays" },
  { value: "sundays", label: "Sundays" },
];

export const availabilityText = (values: readonly Availability[]): string =>
  AVAILABILITY_OPTIONS.filter((option) => values.includes(option.value))
    .map((option) => option.label)
    .join(", ");
