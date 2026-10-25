import { ALLOWED_CATEGORIES, type WorkCategory } from "../src/domain/allowedWork";
import { decideReview } from "../src/domain/tryoutDecisions";
import { adminDb } from "../src/server/firebaseAdmin";
import { firestoreTryoutRepository } from "../src/server/repositories/firestoreTryoutRepository";
import { announceTarget, flag } from "./adminTarget";

/**
 * Handles tryouts the AI couldn't classify, until there is a review screen.
 * Admin only: it needs the Admin credentials, and every decision is
 * audit-logged under the reviewer's name. Only an allowed kind of work can be
 * approved (decideReview), the same rule as posting.
 *
 *   npm run review:tryout                                                  lists tryouts waiting for review
 *   npm run review:tryout -- <id> approve <category> --reviewer <name>     puts it live as that kind of work
 *   npm run review:tryout -- <id> reject --reviewer <name>                 takes it down
 */
const [id, action, category] = process.argv.slice(2).filter((arg, index, all) => !arg.startsWith("--") && all[index - 1] !== "--reviewer");
const reviewer = flag(process.argv, "reviewer");

async function list(): Promise<void> {
  const waiting = await adminDb().collection("tryouts").where("status", "==", "review").get();
  if (waiting.empty) return console.log("No tryouts are waiting for review.");
  for (const doc of waiting.docs) {
    console.log(`${doc.id}  ${doc.get("businessName")}, ${doc.get("area")}: "${doc.get("title")}"`);
    for (const task of doc.get("tasks") as string[]) console.log(`    - ${task}`);
  }
  console.log(`\nApprove with one of: ${ALLOWED_CATEGORIES.join(", ")}`);
}

async function review(): Promise<void> {
  if (action !== "approve" && action !== "reject") throw new Error("The action must be approve or reject.");
  if (!reviewer || !/^[a-z0-9-]{2,40}$/i.test(reviewer)) throw new Error("Name the reviewer with --reviewer <name> (letters, digits and hyphens).");
  const kind = category as WorkCategory | undefined;
  const actor = `admin:${reviewer}`;
  const outcome = await firestoreTryoutRepository.transact(id ?? "", actor, (tryout) => {
    const decision = decideReview(tryout, action, kind);
    if (decision.kind === "refuse") return { write: null, result: `Refused: ${decision.problem}` };
    if (decision.kind === "reject") return { write: { status: "withdrawn", audit: "tryout_rejected" }, result: "Rejected: the tryout is down." };
    return { write: { status: "published", audit: "tryout_approved", category: decision.category }, result: `Approved as ${decision.category}: the tryout is live.` };
  });
  console.log(outcome);
  if (outcome.startsWith("Refused")) process.exitCode = 1;
}

announceTarget();
(id ? review() : list()).then(
  () => process.exit(process.exitCode ?? 0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
