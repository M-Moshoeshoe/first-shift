import type { Party } from "../src/domain/cancellation";
import type { ReviewAction } from "../src/domain/review";
import type { StrikeReason } from "../src/domain/strikes";
import { AppError } from "../src/server/errors";
import { firestoreReviewRepository } from "../src/server/repositories/firestoreReviewRepository";
import type { CaseContext } from "../src/server/repositories/reviewRepository";
import { liveCreditService } from "../src/server/services/liveCreditService";
import { createReviewService } from "../src/server/services/reviewService";
import { announceTarget, flag } from "./adminTarget";

/**
 * The review list, until there is a screen for it. Admin only: it needs the
 * Admin credentials, and every action is audit-logged under the admin's name
 * with the reasoning (reviewService.ts). Priority: safety, then payment, then
 * references, then tryouts and credit requests.
 *
 *   npm run review:case                          lists open cases by priority
 *   npm run review:case -- <caseId>              shows the full context
 *   npm run review:case -- <caseId> resolve --outcome "<what was decided>" --reason "<why>" --admin <name>
 *       and any of: --pause business|young_person   --unpause business|young_person
 *                   --strike business|young_person:no_show|late_cancellation|false_payment_claim|upheld_safety_report
 *                   --overturn <strikeId>   --reference uphold|reject   --grant <credits>
 */
const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--outcome", "--reason", "--admin", "--pause", "--unpause", "--strike", "--overturn", "--reference", "--grant"]);
const [caseId, command] = args.filter((arg, index) => !arg.startsWith("--") && !VALUE_FLAGS.has(args[index - 1] ?? ""));
const all = (name: string): string[] => args.flatMap((arg, index) => (arg === `--${name}` && args[index + 1] ? [args[index + 1] ?? ""] : []));
const PARTIES = new Set<string>(["business", "young_person"]);
const STRIKES = new Set<string>(["no_show", "late_cancellation", "false_payment_claim", "upheld_safety_report"]);

function party(value: string): Party {
  if (!PARTIES.has(value)) throw new Error(`"${value}" isn't a party: use business or young_person.`);
  return value as Party;
}

function actions(): ReviewAction[] {
  const list: ReviewAction[] = [];
  for (const value of all("pause")) list.push({ kind: "pause", party: party(value) });
  for (const value of all("unpause")) list.push({ kind: "unpause", party: party(value) });
  for (const value of all("strike")) {
    const [who = "", reason = ""] = value.split(":");
    if (!STRIKES.has(reason)) throw new Error(`"${reason}" isn't a strike reason.`);
    list.push({ kind: "strike", party: party(who), reason: reason as StrikeReason });
  }
  for (const value of all("overturn")) list.push({ kind: "overturn", strikeId: value });
  for (const value of all("reference")) {
    if (value !== "uphold" && value !== "reject") throw new Error("--reference takes uphold or reject.");
    list.push({ kind: "reference", verdict: value });
  }
  for (const value of all("grant")) list.push({ kind: "grant", amount: Number(value) });
  return list;
}

const service = createReviewService({ reviews: firestoreReviewRepository, grant: (businessId, amount, reason, admin) => liveCreditService().grant(businessId, amount, reason, admin) });
const show = (label: string, value: unknown) => console.log(`\n${label}\n${JSON.stringify(value, (_key, item: unknown) => (item && typeof item === "object" && "toDate" in item ? String(item) : item), 2)}`);

function print(context: CaseContext): void {
  console.log(`Case ${context.id}${context.demo ? " [demo]" : ""}, opened ${context.openedAt.toISOString()}`);
  show("The case", context.item);
  show("Who it's about", context.parties);
  show("Young person and owner (users)", context.users);
  show("Business", context.businesses);
  if (context.booking) {
    const { booking } = context;
    show(`Booking ${context.bookingId}: the timeline`, { booked: booking.bookedAt, start: booking.startAt, checkedIn: booking.checkedInAt, ended: booking.ended, cancelled: booking.cancellation, status: booking.status });
    show("The payment", { owed: booking.owedCents, minimum: booking.owedMinimumCents, payment: booking.payment, methods: booking.workerPayMethods });
  }
  if (context.reference) show("The reference", context.reference);
  show("Evidence (private Storage paths, read with the Firebase console)", context.evidence);
  show("Earlier cases about either party", context.history);
  show("Strikes", context.strikes);
}

async function main(): Promise<void> {
  announceTarget();
  if (!caseId) {
    const open = await service.list();
    if (open.length === 0) return console.log("No open cases.");
    for (const item of open) console.log(`${item.priority.padEnd(20)} ${item.id}  ${item.item.kind}  ${item.openedAt.toISOString()}${item.demo ? "  [demo]" : ""}`);
    return;
  }
  if (!command) return print(await service.context(caseId));
  if (command !== "resolve") throw new Error(`Unknown command "${command}": use resolve.`);
  const result = await service.resolve(caseId, { outcome: flag(args, "outcome") ?? "", reason: flag(args, "reason") ?? "", admin: flag(args, "admin") ?? "", actions: actions() });
  console.log(`Case ${caseId} closed, with ${result.actions} action(s), each audit-logged.`);
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof AppError ? error.publicMessage : error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
