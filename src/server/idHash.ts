import "server-only";
import { createHmac } from "node:crypto";
import { PROFILE_MESSAGES } from "@/domain/messages";
import { AppError } from "./errors";
import { serverEnv } from "./env";
import { log } from "./log";

/**
 * ID numbers are stored only as a keyed hash, so a leaked database can't be
 * reversed into ID numbers. The same ID always gives the same hash, which lets
 * us stop one ID from opening several accounts.
 */
export function hashIdNumber(digits: string): string {
  const secret = serverEnv().ID_HASH_SECRET;
  if (!secret) {
    // Fail closed: without the secret nothing is checked, so nothing is saved.
    log("error", "id_hashing_not_configured", { hint: "Set ID_HASH_SECRET (see README)." });
    throw new AppError(503, "id_checks_off", PROFILE_MESSAGES.idChecksOff);
  }
  return createHmac("sha256", secret).update(digits).digest("hex");
}
