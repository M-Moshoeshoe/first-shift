import * as z from "zod/mini";
import { RULES } from "@/config/rules";
import { DAY_COPY, EVIDENCE_COPY, EVIDENCE_MESSAGES } from "@/domain/dayMessages";
import { PAYMENT_METHODS } from "@/domain/paymentFlow";

// What the day's steps send that carries the day's own copy. Only route handlers import this, so the
// pages that read schemas/booking.ts don't download these sentences.

export const MarkPaidSchema = z.object({
  method: z.enum(PAYMENT_METHODS, { error: "Choose how you paid." }),
  amountCents: z.int({ error: "Enter the amount in rand, like 210 or 210.00." }).check(z.positive("Enter the amount in rand, like 210 or 210.00."), z.lte(10_000_000)),
  // Plain text on one line, as a bank shows it.
  reference: z.optional(z.string({ error: DAY_COPY.referenceTooLong }).check(z.trim(), z.maxLength(RULES.paymentReferenceMaxChars, DAY_COPY.referenceTooLong), z.regex(/^[^\p{Cc}]*$/u, DAY_COPY.referenceTooLong))),
});

// A screenshot under 2 MB, as base64: four characters for every three bytes.
const EVIDENCE_BASE64_MAX = Math.ceil(RULES.photoMaxBytes / 3) * 4;

/** POST /api/bookings/[id]/evidence. The server reads what the file really is (evidence.ts, sniffImage). */
export const EvidenceSchema = z.object({
  image: z.string({ error: EVIDENCE_COPY.choose }).check(z.minLength(16, EVIDENCE_COPY.choose), z.maxLength(EVIDENCE_BASE64_MAX, EVIDENCE_MESSAGES.too_big), z.regex(/^[A-Za-z0-9+/]+={0,2}$/, EVIDENCE_MESSAGES.not_an_image)),
  note: z.optional(z.string({ error: EVIDENCE_COPY.noteTooLong }).check(z.trim(), z.maxLength(RULES.evidenceNoteMaxChars, EVIDENCE_COPY.noteTooLong))),
});
