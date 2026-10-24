import { RULES } from "@/config/rules";
import { fail, ok, type Result } from "./result";

export type IdProblem = "format" | "date_of_birth" | "check_digit" | "citizenship_digit" | "under_age";

export interface IdCheck {
  dateOfBirth: Date;
  age: number;
  residency: "citizen" | "permanent_resident";
  lastFour: string;
}

/** Standard Luhn check over all 13 digits. */
function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function ageOn(dateOfBirth: Date, today: Date): number {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (today.getUTCMonth() === dateOfBirth.getUTCMonth() && today.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Checks the structure of a South African ID number: date of birth, residency
 * digit and check digit. It catches typos and invented numbers, not stolen
 * ones; the in-person check at the door covers that.
 */
export function checkSaId(raw: string, today: Date): Result<IdCheck, IdProblem> {
  const digits = raw.replace(/\s+/g, "");
  if (!/^\d{13}$/.test(digits)) return fail("format");

  const yy = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  const century = yy > today.getUTCFullYear() % 100 ? 1900 : 2000;
  const dateOfBirth = new Date(Date.UTC(century + yy, month - 1, day));
  const validDate = dateOfBirth.getUTCMonth() === month - 1 && dateOfBirth.getUTCDate() === day && dateOfBirth <= today;
  if (!validDate) return fail("date_of_birth");

  const residencyDigit = digits[10];
  if (residencyDigit !== "0" && residencyDigit !== "1") return fail("citizenship_digit");
  if (!passesLuhn(digits)) return fail("check_digit");

  const age = ageOn(dateOfBirth, today);
  if (age < RULES.minimumAge) return fail("under_age");

  return ok({ dateOfBirth, age, residency: residencyDigit === "0" ? "citizen" : "permanent_resident", lastFour: digits.slice(-4) });
}
