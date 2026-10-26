import * as z from "zod/mini";

/** POST /api/terms/accept: the agreement is on record, for this version. */
export const TermsAcceptedSchema = z.object({ status: z.enum(["accepted", "unchanged"]), version: z.string() });
