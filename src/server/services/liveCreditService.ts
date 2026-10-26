import "server-only";
import { firestoreCreditRepository } from "../repositories/firestoreCreditRepository";
import { createCreditService, type CreditService } from "./creditService";

/** The credit service wired to Firestore. Routes and npm run credits:grant use it; tests use fakes. */
export function liveCreditService(): CreditService {
  return createCreditService({ credits: firestoreCreditRepository, now: () => new Date() });
}
