import type { PaymentMethod } from "./paymentFlow";

/*
 * The four payment methods' names and what each needs, on their own so the
 * onboarding and profile screens load these lines without the rest of the
 * day's copy (docs/DESIGN.md, Performance). Copy rules: AGENTS.md.
 */

/** The four methods, named the same way everywhere. */
export const METHOD_LABELS: Record<PaymentMethod, string> = {
  ewallet: "FNB eWallet",
  payshap: "PayShap",
  cash_send: "Cash-send",
  cash: "Cash",
};

/** What each method needs, under its name on the young person's profile. */
export const METHOD_DETAILS: Record<PaymentMethod, string> = {
  ewallet: "To your cellphone number. You do not need a bank account; the business must bank with FNB.",
  payshap: "To your cellphone number, instantly. Your bank must support PayShap.",
  cash_send: "From the business's own bank, such as Standard Bank Instant Money or Absa CashSend, to your cellphone number.",
  cash: "In person, at the end of the day.",
};

/** The question on the young person's profile. Bank account numbers are never asked for. */
export const PAY_METHODS_QUESTION = {
  legend: "How can businesses pay you?",
  hint: "Choose every way that works for you. Businesses pay you directly, to your number for payments. We never ask for a bank account number.",
} as const;

/** The methods as checkbox options, in the order shown everywhere. */
export const payMethodOptions = (methods: readonly PaymentMethod[]) => methods.map((value) => ({ value, label: METHOD_LABELS[value], detail: METHOD_DETAILS[value] }));
