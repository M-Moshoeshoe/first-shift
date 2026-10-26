import { RULES } from "@/config/rules";
import { ALLOWED_CATEGORIES, type AllowedCategory } from "./allowedWork";

/*
 * What a young person says about themselves, shown to the owner on the
 * shortlist: up to 4 kinds of work they can do (the same categories a
 * tryout can be, allowedWork.ts), the languages they speak, and one line
 * introducing them, with any contact details taken out.
 */

/** The kinds of work a young person can say they do: exactly the kinds a tryout can be. */
export const SKILLS = ALLOWED_CATEGORIES;
export type Skill = AllowedCategory;

/** South Africa's official languages, South African Sign Language among them. */
export const LANGUAGES = ["english", "afrikaans", "isizulu", "isixhosa", "isindebele", "sepedi", "sesotho", "setswana", "siswati", "tshivenda", "xitsonga", "sasl"] as const;
export type Language = (typeof LANGUAGES)[number];

// Anything that would let the owner reach the young person before booking: the number comes only once booked.
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi;
const DOMAIN = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:co\.za|org\.za|com|net|org|za|io|me|ly|app|link)\b(?:\/\S*)?/gi;
const HANDLE = /(?:^|\s)@[a-z0-9_.]{2,}/gi;
// A run of digits with spaces, dots, dashes or brackets between them: a phone number once it holds 9 or more digits.
const DIGIT_RUN = /\+?\(?\d[\d\s().-]*\d/g;

/**
 * The one-line introduction as the owner sees it: phone numbers, email
 * addresses, links and social handles taken out, spaces tidied, and cut to
 * 120 characters. Contact details reach the owner only once they've booked.
 */
export function cleanIntro(text: string): string {
  return text
    .replace(EMAIL, " ")
    .replace(LINK, " ")
    .replace(DOMAIN, " ")
    .replace(HANDLE, " ")
    .replace(DIGIT_RUN, (run) => (run.replace(/\D/g, "").length >= 9 ? " " : run))
    .replace(/\s+/g, " ")
    // A comma or full stop left behind after a removed number goes back against the word before it.
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim()
    .slice(0, RULES.introMaxChars)
    .trim();
}

/** How well a young person's stated skills fit a tryout, 0 to 1, for ranking (ranking.ts). */
export function skillFit(skills: readonly Skill[] | undefined, category: string | null): number {
  if (!skills?.length || !category) return 0.5;
  return skills.some((skill) => skill === category) ? 1 : 0.25;
}
