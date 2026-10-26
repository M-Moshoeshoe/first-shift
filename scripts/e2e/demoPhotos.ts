import { apiGet } from "../../src/lib/api";
import { clientAuth } from "../../src/lib/firebaseClient";
import { DEMO_HISTORY_IDS } from "../../src/data/demo";
import { DEMO_ART, type DemoArt } from "../../src/data/demoArt";
import { sniffImage } from "../../src/domain/evidence";
import { ApplicationsSchema, BookingViewSchema, OwnerTryoutSchema } from "../../src/schemas/booking";
import { NearbySchema } from "../../src/schemas/finding";
import { RecordViewSchema } from "../../src/schemas/record";
import { readArt } from "../demoArt/files";
import { switchTo } from "./demoAccounts";

/**
 * After npm run demo:reset, every place a demo face or shopfront appears,
 * fetched the way that screen fetches it (PersonPhoto: GET /api/photos with
 * the sign-in token) as the demo account the screen belongs to. Each must be
 * a PNG, byte for byte the illustration in scripts/demoArt/png, never the
 * server's drawn placeholder. Used by npm run e2e:demo.
 */
const SHOPFRONTS: readonly [business: string, art: DemoArt][] = [
  ["Sipho's Phone Repairs", "sipho-phone-repairs"],
  ["Lerato's Spaza", "lerato-spaza"],
  ["Ayanda's Car Wash", "ayanda-car-wash"],
];
// Sipho and Thabo's first finished tryout together, seeded by the reset (src/data/demo.ts).
const PAST_BOOKING = DEMO_HISTORY_IDS[1];

/** Whether the signed-in account is shown this illustration for this photo, as PersonPhoto would ask for it. */
export async function showsArt(subject: string, kind: "profile" | "shopfront", art: DemoArt): Promise<{ ok: boolean; status: number; contentType: string | null; bytes: number }> {
  const token = (await clientAuth().currentUser?.getIdToken()) ?? "";
  const response = await fetch(`/api/photos/${encodeURIComponent(subject)}/${kind}`, { headers: { authorization: `Bearer ${token}` } });
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");
  const ok = response.status === 200 && contentType === "image/png" && sniffImage(bytes) === "image/png" && bytes.equals(readArt(art) ?? Buffer.alloc(0));
  return { ok, status: response.status, contentType, bytes: bytes.length };
}

async function expectArt(seen: Record<string, string>, place: string, subject: string | undefined, kind: "profile" | "shopfront", art: DemoArt): Promise<void> {
  if (!subject) throw new Error(`${place}: the screen has no photo to ask for.`);
  const shown = await showsArt(subject, kind, art);
  if (!shown.ok) throw new Error(`${place} should show the illustration ${art}.png, got ${JSON.stringify(shown)}`);
  seen[place] = `${art}.png`;
}

/** An example applicant's illustration has their first name (src/data/demoArt.ts). */
function artNamed(firstName: string): DemoArt {
  const art = DEMO_ART.find((name) => name === firstName.toLowerCase());
  if (!art) throw new Error(`No illustration for ${firstName}`);
  return art;
}

export async function demoPhotoChecks(steps: Record<string, unknown>): Promise<void> {
  const seen: Record<string, string> = {};

  // Thabo: each business's shopfront on his feed, Sipho's face and shopfront on their booking, and his record.
  await switchTo("thabo");
  const feed = await apiGet("/api/tryouts/nearby", NearbySchema);
  if (feed.status !== "ok") throw new Error(`Thabo's feed should load: ${JSON.stringify(feed)}`);
  for (const [business, art] of SHOPFRONTS) await expectArt(seen, `Thabo's feed: ${business}`, feed.items.find((item) => item.businessName === business)?.photoSubject, "shopfront", art);
  const booking = await apiGet(`/api/bookings/${PAST_BOOKING}`, BookingViewSchema);
  await expectArt(seen, "Thabo's booking: Sipho's face", booking.owner?.subject, "profile", "sipho");
  await expectArt(seen, "Thabo's booking: the shopfront", booking.photo.subject, booking.photo.kind, "sipho-phone-repairs");
  const record = await apiGet("/api/record", RecordViewSchema);
  for (const entry of record.entries) await expectArt(seen, `Thabo's record: ${entry.title}, ${entry.day}`, entry.photoSubject, "shopfront", "sipho-phone-repairs");
  const tryoutId = (await apiGet("/api/applications", ApplicationsSchema)).items.find((item) => item.businessName === "Sipho's Phone Repairs")?.tryoutId ?? "";

  // Sipho: Thabo and the six example applicants on his shortlist, Thabo's face for the door check, and his own details.
  await switchTo("sipho");
  const siphoUid = clientAuth().currentUser?.uid ?? "";
  const { applicants } = await apiGet(`/api/tryouts/${encodeURIComponent(tryoutId)}/applicants`, OwnerTryoutSchema);
  if (applicants.length !== 7) throw new Error(`Sipho's first tryout should list Thabo and six example applicants, got ${applicants.length}`);
  for (const applicant of applicants) await expectArt(seen, `Sipho's shortlist: ${applicant.firstName}`, applicant.workerId, "profile", artNamed(applicant.firstName));
  const door = await apiGet(`/api/bookings/${PAST_BOOKING}`, BookingViewSchema);
  await expectArt(seen, "Sipho's booking: Thabo's face for the door check", door.photo.subject, door.photo.kind, "thabo");
  await expectArt(seen, "Sipho's details: his face", siphoUid, "profile", "sipho");
  await expectArt(seen, "Sipho's details: his shopfront", siphoUid, "shopfront", "sipho-phone-repairs");

  steps["7d. demo faces and shopfronts, as each screen shows them"] = seen;
}
