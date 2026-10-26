import { sastParts } from "./time";

/** "Good morning" until 12:00, "Good afternoon" until 18:00, then "Good evening", by the South African clock. */
export function greetingFor(now: Date): string {
  const { hour } = sastParts(now);
  if (hour < 12) return "Good morning";
  return hour < 18 ? "Good afternoon" : "Good evening";
}

/** The dashboard's one line from the business's own numbers: credits ready to use. */
export function creditsLine(available: number, onlyFree: boolean): string {
  if (available === 0) return "No credits left. Request more under Credits.";
  const what = onlyFree ? (available === 1 ? "free tryout" : "free tryouts") : available === 1 ? "credit" : "credits";
  return `${available} ${what} ready to use.`;
}

/** The feed's one line: how many tryouts are open to this young person right now. */
export function feedCountLine(count: number): string {
  if (count === 0) return "No tryouts within reach right now.";
  return `${count} paid ${count === 1 ? "tryout" : "tryouts"} within reach right now.`;
}
