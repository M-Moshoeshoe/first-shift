import type { AllowedCategory } from "@/domain/allowedWork";
import type { ApplicationRecord } from "@/domain/applications";
import type { CreditEntry } from "@/domain/credits";
import type { CoidaAnswer } from "@/domain/injuryCover";
import { newAccount, photoPath, type BusinessRecord, type UserRecord } from "@/domain/profile";
import { checkTerms, newTryout, type TryoutRecord, type TryoutTerms } from "@/domain/tryoutDecisions";
import { DEMO_EXAMPLE_OWNERS } from "@/config/demo";
import { RULES } from "@/config/rules";
import { addDays, sastDateKey } from "@/domain/time";
import { pastLedger, pastTryouts, type PastTryout } from "./demoHistory";

/**
 * The known state npm run demo:reset puts the demo world back to. Every
 * record here is marked demo: true, so only the demo accounts ever see it
 * (domain/demo.ts). Two of the three businesses have no account behind them;
 * they're there so Thabo's feed isn't one business long.
 */
export interface DemoUids {
  business: string;
  youngPerson: string;
}

export interface DemoState {
  users: Record<string, UserRecord>;
  businesses: Record<string, BusinessRecord>;
  /** The demo business account's credit ledger. */
  ledger: CreditEntry[];
  tryouts: TryoutRecord[];
  /** Sipho and Thabo's two finished tryouts this month (demoHistory.ts). */
  history: PastTryout[];
}

/** The past tryouts' documents: fixed ids, so every reset puts the same ones back. */
export const DEMO_HISTORY_IDS = ["demo-past-tryout-1", "demo-past-booking-1", "demo-past-tryout-2", "demo-past-booking-2"] as const;

/** Added on top of the free credits, so judges can post and book without running out. */
const DEMO_EXTRA_CREDITS = 5;

/** The demo businesses with no account behind them (src/config/demo.ts). */
export const DEMO_EXTRA_OWNERS = DEMO_EXAMPLE_OWNERS;

const photo = (uid: string, kind: "profile" | "shopfront") => ({ path: photoPath(uid, kind), version: "demo" });

function business(uid: string, details: { name: string; area: string; latitude: number; longitude: number; completed: number; paidOnTime: number; coida: CoidaAnswer }): BusinessRecord {
  const base = newAccount(uid, "business", true).business;
  if (!base) throw new Error("a business account always has a business record");
  return {
    ...base,
    completed: details.completed,
    onTime: details.completed,
    // Every completed demo tryout was paid and confirmed; some not by 23:59 that day.
    ...(details.completed > 0 ? { payments: details.completed, paidOnTime: details.paidOnTime } : {}),
    name: details.name,
    area: details.area,
    openingHours: "Monday to Saturday, 8:00 to 17:00",
    location: { latitude: details.latitude, longitude: details.longitude, accuracyMetres: 15 },
    shopfrontPhoto: photo(uid, "shopfront"),
    coida: details.coida,
  };
}

interface Slot {
  owner: string;
  daysAhead: number;
  startTime: string;
  hours: number;
  rateCentsPerHour: number;
  title: string;
  tasks: string[];
  category: AllowedCategory;
}

function tryout(slot: Slot, owners: Record<string, BusinessRecord>, now: Date): TryoutRecord {
  const owner = owners[slot.owner];
  const terms: TryoutTerms = {
    description: `${slot.title}: ${slot.tasks.join(", ")}`,
    title: slot.title,
    tasks: slot.tasks,
    date: sastDateKey(addDays(now, slot.daysAhead)),
    startTime: slot.startTime,
    hours: slot.hours,
    rateCentsPerHour: slot.rateCentsPerHour,
  };
  const decided = checkTerms(now, terms);
  const record = owner && decided.ok ? newTryout({ uid: slot.owner, demo: true }, owner, terms, decided.value, "published", slot.category) : null;
  if (!record) throw new Error(`demo tryout "${slot.title}" breaks a rule`);
  return record;
}

/** Thabo's application to the first of Sipho's tryouts, so a judge signed in as Sipho has someone to offer it to. */
export function demoApplication(tryoutId: string, tryout: TryoutRecord, youngPersonUid: string): ApplicationRecord {
  return { tryoutId, workerId: youngPersonUid, ownerId: tryout.ownerId, note: "I live in Ivory Park and can be there by 8:30.", status: "applied", demo: true, startAt: tryout.startAt, endAt: tryout.endAt, seenByOwner: false };
}

/** The whole demo world as of now: two complete profiles, three businesses and four live tryouts in the next three days. */
export function demoState(uids: DemoUids, now: Date): DemoState {
  const [lerato, ayanda] = DEMO_EXTRA_OWNERS;
  const businesses: Record<string, BusinessRecord> = {
    // Randburg: about 21 km from Thabo in Ivory Park, on a direct taxi route (R28 each way).
    // Sipho's own details as the owner: a number nobody can be reached on, like Thabo's.
    [uids.business]: { ...business(uids.business, { name: "Sipho's Phone Repairs", area: "Randburg", latitude: -26.0939, longitude: 28.0071, completed: 2, paidOnTime: 2, coida: "registered" }), ownerFirstName: "Sipho", ownerPhone: "27000000001" },
    [lerato]: business(lerato, { name: "Lerato's Spaza", area: "Tembisa", latitude: -25.9964, longitude: 28.2268, completed: 6, paidOnTime: 6, coida: "registered" }),
    [ayanda]: business(ayanda, { name: "Ayanda's Car Wash", area: "Ivory Park", latitude: -25.9861, longitude: 28.1958, completed: 2, paidOnTime: 1, coida: "not_sure" }),
  };
  const thabo: UserRecord = {
    ...newAccount(uids.youngPerson, "young_person", true).user,
    firstName: "Thabo",
    area: "Ivory Park",
    availability: ["weekday_mornings", "saturdays"],
    // Not a number anyone can be reached on, so nothing ever messages a real person.
    payoutPhone: "27000000000",
    payMethods: ["ewallet", "cash"],
    skills: ["customer_service", "stock_and_packing"],
    languages: ["english", "isizulu", "sepedi"],
    intro: "I'm good with customers and I keep shelves neat.",
    legalSurname: "Mokoena",
    idLastFour: "0000",
    residency: "citizen",
    profilePhoto: photo(uids.youngPerson, "profile"),
    // The two finished tryouts with Sipho, both on time (demoHistory.ts).
    completed: 2,
    onTime: 2,
  };
  const slots: Slot[] = [
    { owner: uids.business, daysAhead: 1, startTime: "09:00", hours: 6, rateCentsPerHour: 3500, title: "Phone shop helper", tasks: ["Greet customers and write repairs in the book", "Clean and pack phone cases on the shelves"], category: "customer_service" },
    { owner: lerato, daysAhead: 1, startTime: "08:00", hours: 5, rateCentsPerHour: 3200, title: "Spaza shop helper", tasks: ["Pack bread and cool drinks onto the shelves", "Serve customers at the counter"], category: "stock_and_packing" },
    { owner: ayanda, daysAhead: 2, startTime: "09:00", hours: 6, rateCentsPerHour: 3100, title: "Car wash helper", tasks: ["Wash and dry cars by hand", "Vacuum seats and mats"], category: "car_washing" },
    { owner: uids.business, daysAhead: 3, startTime: "10:00", hours: RULES.minPaidHours, rateCentsPerHour: RULES.minimumWageCentsPerHour, title: "Stock count helper", tasks: ["Count phone accessories and write down the totals", "Pack stock into labelled boxes"], category: "stock_and_packing" },
  ];
  const tryouts = slots.map((slot) => tryout(slot, businesses, now));
  const sipho = businesses[uids.business];
  const [phoneShop] = tryouts;
  if (!sipho || !phoneShop) throw new Error("the demo always has Sipho's business and a phone shop tryout");
  const history = pastTryouts([phoneShop, phoneShop], DEMO_HISTORY_IDS, sipho, uids.youngPerson, thabo);
  return {
    users: {
      [uids.business]: { ...newAccount(uids.business, "business", true).user, legalName: "Sipho Dlamini", idLastFour: "0000", residency: "citizen", profilePhoto: photo(uids.business, "profile") },
      [uids.youngPerson]: thabo,
    },
    businesses,
    ledger: [{ kind: "grant", amount: RULES.freeCredits, reason: "welcome" }, ...pastLedger(history), { kind: "grant", amount: DEMO_EXTRA_CREDITS, reason: "granted" }],
    tryouts,
    history,
  };
}
