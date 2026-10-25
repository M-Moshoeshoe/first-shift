/*
 * Scam rules (docs/RULES.md), enforced in code and stated in copy:
 *  - young people never pay anyone to get a tryout;
 *  - First Shift never asks anyone to send money back;
 *  - an overpayment is settled only by review (cases.ts, paid_too_much).
 * The first is checked here on every tryout before the AI sees it. The other
 * two hold because no screen or route ever asks a young person for money.
 */

// A fee or a deposit by name, wherever it appears.
const FEES = /\b(deposit|joining fee|registration fee|admin(?:istration)? fee|application fee|training fee|uniform fee|placement fee|starter (?:fee|pack)|security fee)s?\b/i;
// The young person told to pay, send or buy something.
const MUST_PAY = /\b(?:you|applicants?|candidates?|workers?|helpers?)\s+(?:must|(?:will )?need to|(?:will )?have to|should|will|are to)\s+(?:first\s+)?(?:pay|send|transfer|deposit|buy|purchase)\b/i;
// Money sent to the business or the poster.
const SEND_US = /\b(?:send|transfer|e-?wallet|cash-?send)\s+(?:us|me|the owner)\b/i;

/** Whether a tryout's text asks the young person to pay anything to get it or do it. */
export function asksForMoney(text: string): boolean {
  return FEES.test(text) || MUST_PAY.test(text) || SEND_US.test(text);
}
