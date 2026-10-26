import { BALANCE_CHECK_ANY, BALANCE_CHECKS, EWALLET_BALANCE_CODES } from "@/domain/dayMessages";
import type { PaymentMethod } from "@/domain/paymentFlow";

const isCode = (part: string): part is (typeof EWALLET_BALANCE_CODES)[number] => EWALLET_BALANCE_CODES.some((code) => code === part);
// Split around each code, keeping it: "*" is special in a pattern, so each is escaped.
const AROUND_CODES = new RegExp(`(${EWALLET_BALANCE_CODES.map((code) => code.replace(/[*#]/g, "\\$&")).join("|")})`);

/**
 * How to check the payment is real before tapping Received, for the method
 * the owner used. The eWallet codes are written out exactly, asterisks and
 * all, and each one dials when tapped (# is %23 in a tel: link).
 */
export function BalanceCheck({ method }: { method: PaymentMethod | null }) {
  const text = method ? BALANCE_CHECKS[method] : BALANCE_CHECK_ANY;
  return (
    <p className="text-base font-semibold">
      {text.split(AROUND_CODES).map((part, index) =>
        isCode(part) ? (
          <a key={index} href={`tel:${encodeURIComponent(part)}`} className="whitespace-nowrap underline underline-offset-4">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
