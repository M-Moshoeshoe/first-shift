import { Timestamp } from "firebase-admin/firestore";
import { pilotMetrics, type MetricBooking, type MetricCase, type MetricReference } from "../src/domain/pilotMetrics";
import { adminDb } from "../src/server/firebaseAdmin";
import { parseBooking } from "../src/server/repositories/firestoreRecords";
import { announceTarget } from "./adminTarget";

/**
 * The pilot's numbers (docs/PHASES.md, Pilot), per week and in total: tryouts
 * completed and paid, the paid-on-time rate, repeat businesses, safety
 * reports and how long they took to close, references approved, and job
 * offers. Real records only: anything marked demo, or about a demo business,
 * is left out. Read-only.
 *
 *   npm run pilot:metrics
 */
const at = (value: unknown): Date | null => (value instanceof Timestamp ? value.toDate() : null);

async function main(): Promise<void> {
  announceTarget();
  const db = adminDb();
  const [bookings, cases, references, offers, demoBusinesses] = await Promise.all([
    db.collection("bookings").get(),
    db.collection("cases").get(),
    db.collection("references").get(),
    db.collection("hireOffers").get(),
    db.collection("businesses").where("demo", "==", true).get(),
  ]);
  const demo = new Set(demoBusinesses.docs.map((doc) => doc.id));

  const metricBookings: MetricBooking[] = bookings.docs
    .map((doc) => parseBooking(doc.data()))
    .filter((booking) => !booking.demo)
    .map((booking) => ({
      ownerId: booking.ownerId,
      startAt: booking.startAt,
      dueAt: booking.ended?.at ?? booking.cancellation?.at ?? null,
      markedPaidAt: booking.payment?.markedPaidAt ?? null,
      received: booking.payment?.state === "received",
    }));
  const metricCases: MetricCase[] = cases.docs
    .filter((doc) => !doc.get("demo") && !demo.has(String(doc.get("businessId") ?? doc.get("ownerId") ?? "")))
    .map((doc) => ({ kind: String(doc.get("kind")), detail: String(doc.get("category") ?? doc.get("reason") ?? ""), openedAt: at(doc.get("openedAt")) ?? new Date(0), closedAt: doc.get("status") === "closed" ? at(doc.get("closedAt")) : null }));
  const metricReferences: MetricReference[] = references.docs
    .filter((doc) => !doc.get("demo"))
    .map((doc) => ({ status: String(doc.get("status")), challenged: Boolean(doc.get("challengedAt")), at: at(doc.get("createdAt")) ?? new Date(0) }));
  const hireOffers = offers.docs.filter((doc) => !doc.get("demo")).flatMap((doc) => at(doc.get("at")) ?? []);

  const rows = pilotMetrics({ bookings: metricBookings, cases: metricCases, references: metricReferences, hireOffers });
  if (rows.length === 1 && rows[0]?.completedAndPaid === 0) console.log("No real tryouts yet: every number below is zero.");
  console.table(rows);
  console.log("Targets by week 6: 60 completed and paid; half of active businesses repeat; every safety report closed within 48 hours; 9 in 10 references approved; 5 job offers.");
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
