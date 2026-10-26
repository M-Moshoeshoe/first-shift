import { AppError } from "../src/server/errors";
import { adminDb } from "../src/server/firebaseAdmin";
import { liveCreditService } from "../src/server/services/liveCreditService";
import { announceTarget, flag } from "./adminTarget";

/**
 * Adds credits to a business by hand, until top-ups open, and closes its
 * request for more. Admin only: it needs the Admin credentials, and the grant
 * is audit-logged under the admin's name with the reason (creditService.ts).
 *
 *   npm run credits:grant                                                     lists open requests for credits
 *   npm run credits:grant -- <businessUid> <amount> --reason "<why>" --admin <name>
 */
const FLAGS = new Set(["--reason", "--admin"]);
const [businessId, amountText] = process.argv.slice(2).filter((arg, index, all) => !arg.startsWith("--") && !FLAGS.has(all[index - 1] ?? ""));
const reason = flag(process.argv, "reason") ?? "";
const admin = flag(process.argv, "admin");

async function list(): Promise<void> {
  const open = await adminDb().collection("cases").where("kind", "==", "credit_request").where("status", "==", "open").get();
  if (open.empty) return console.log("No business is waiting for credits.");
  const db = adminDb();
  for (const doc of open.docs) {
    const business = await db.collection("businesses").doc(String(doc.get("businessId"))).get();
    console.log(`${doc.get("businessId")}  ${business.get("name") ?? "(no name)"}, ${business.get("area") ?? ""}${doc.get("demo") ? "  [demo]" : ""}  requested ${doc.get("openedAt")?.toDate?.().toISOString() ?? ""}`);
  }
}

async function grant(): Promise<void> {
  if (!admin || !/^[a-z0-9-]{2,40}$/i.test(admin)) throw new Error("Name the admin with --admin <name> (letters, digits and hyphens).");
  const amount = Number(amountText);
  const result = await liveCreditService().grant(businessId ?? "", amount, reason, admin);
  console.log(`Granted ${result.granted} credits to ${businessId}, audit-logged under admin:${admin}. Requests closed: ${result.closed}.`);
}

announceTarget();
(businessId ? grant() : list()).then(
  () => process.exit(0),
  (error: unknown) => {
    // A refusal carries a message written for whoever runs this (creditsCopy.ts, GRANT_PROBLEMS).
    console.error(error instanceof AppError ? error.publicMessage : error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
