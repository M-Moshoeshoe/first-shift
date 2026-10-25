import { decideWelcomeGrant } from "../src/domain/credits";
import { isProfileComplete } from "../src/domain/profile";
import { adminDb } from "../src/server/firebaseAdmin";
import { firestoreProfileRepository } from "../src/server/repositories/firestoreProfileRepository";
import { announceTarget } from "./adminTarget";

/**
 * One-off: gives the free credits to every business whose profile was
 * complete before credits existed. Uses the same decision and the same
 * transaction as the app (a ledger entry and its audit entry together), so it
 * can run any number of times: a business that has its grant is skipped.
 *
 *   npm run credits:backfill             shows what it would do, changes nothing
 *   npm run credits:backfill -- --apply  grants the credits
 */
const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  announceTarget();
  const businesses = await adminDb().collection("businesses").get();
  let granted = 0;
  for (const doc of businesses.docs) {
    const grant = await firestoreProfileRepository.transact(doc.id, null, (state) => {
      const decision = decideWelcomeGrant(isProfileComplete(state.user, state.business), state.credits);
      if (decision.kind !== "append") return { write: null, result: false };
      return { write: apply ? { ledger: decision.entries, audit: null } : null, result: true };
    });
    if (grant) granted += 1;
  }
  const verb = apply ? "Granted" : "Would grant";
  console.log(`${verb} free credits to ${granted} of ${businesses.size} businesses.${apply || granted === 0 ? "" : " Run again with --apply to grant them."}`);
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
