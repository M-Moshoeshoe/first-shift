import type { DEMO_EXAMPLE_APPLICANTS } from "@/config/demo";
import type { ApplicationRecord } from "@/domain/applications";
import { newAccount, photoPath, type UserRecord } from "@/domain/profile";
import type { TryoutRecord } from "@/domain/tryoutDecisions";
import type { Language, Skill } from "@/domain/workerProfile";

/*
 * Six made-up applicants on Sipho's first tryout, beside Thabo, so a judge
 * signed in as Sipho sees a full ranked list. Each is marked demo: true and
 * labelled "Example applicant"; offering to them is refused (offers.ts), so
 * Thabo stays the one to book. Their faces are illustrations drawn for First
 * Shift, never a photo of a real person (data/demoArt.ts, scripts/demoArt).
 * Histories differ, so their show-up scores do.
 */

interface Example {
  /** One of the ids in src/config/demo.ts, so the offer rule always recognises it. */
  uid: (typeof DEMO_EXAMPLE_APPLICANTS)[number];
  firstName: string;
  area: string;
  skills: Skill[];
  languages: Language[];
  intro: string;
  note: string;
  history: { completed: number; onTime: number; lateCancellations?: number; noShows?: number };
}

const EXAMPLES: readonly Example[] = [
  { uid: "demo-applicant-1", firstName: "Naledi", area: "Diepsloot", skills: ["customer_service", "cleaning"], languages: ["english", "setswana"], intro: "I have helped at my aunt's salon on Saturdays.", note: "I can come early to learn the repair book.", history: { completed: 3, onTime: 3 } },
  { uid: "demo-applicant-2", firstName: "Kagiso", area: "Randburg", skills: ["stock_and_packing"], languages: ["english", "sesotho"], intro: "I like keeping a shop tidy and counting stock.", note: "I live ten minutes from the shop.", history: { completed: 1, onTime: 1 } },
  { uid: "demo-applicant-3", firstName: "Zanele", area: "Alexandra", skills: ["customer_service"], languages: ["english", "isizulu"], intro: "I finished matric this year and I want my first job.", note: "This would be my first tryout.", history: { completed: 0, onTime: 0 } },
  { uid: "demo-applicant-4", firstName: "Lwazi", area: "Midrand", skills: ["customer_service", "stock_and_packing"], languages: ["english", "isixhosa"], intro: "I have worked at a car wash and a tuck shop.", note: "", history: { completed: 4, onTime: 3, lateCancellations: 1 } },
  { uid: "demo-applicant-5", firstName: "Palesa", area: "Tembisa", skills: ["cleaning"], languages: ["english", "sepedi"], intro: "I am patient and good with people.", note: "I can do Saturdays as well.", history: { completed: 2, onTime: 1, noShows: 1 } },
  { uid: "demo-applicant-6", firstName: "Tumelo", area: "Fourways", skills: ["stock_and_packing", "cleaning"], languages: ["english", "setswana", "afrikaans"], intro: "I am good at packing and I work fast.", note: "", history: { completed: 1, onTime: 0 } },
];

/** The example applicants' profiles, keyed by their made-up ids. */
export function exampleApplicantUsers(): Record<string, UserRecord> {
  return Object.fromEntries(
    EXAMPLES.map(({ uid, ...example }) => {
      const user: UserRecord = {
        ...newAccount(uid, "young_person", true).user,
        firstName: example.firstName,
        area: example.area,
        availability: ["saturdays"],
        payoutPhone: "27000000000",
        payMethods: ["cash"],
        skills: example.skills,
        languages: example.languages,
        intro: example.intro,
        legalSurname: "Example",
        idLastFour: "0000",
        residency: "citizen",
        profilePhoto: { path: photoPath(uid, "profile"), version: "demo" },
        completed: example.history.completed,
        onTime: example.history.onTime,
        ...(example.history.lateCancellations ? { lateCancellations: example.history.lateCancellations } : {}),
        ...(example.history.noShows ? { noShows: example.history.noShows } : {}),
      };
      return [uid, user];
    }),
  );
}

/** Their applications to the tryout, already seen, so the owner's badge still counts only Thabo as new. */
export function exampleApplications(tryoutId: string, tryout: TryoutRecord): ApplicationRecord[] {
  return EXAMPLES.map((example) => ({
    tryoutId,
    workerId: example.uid,
    ownerId: tryout.ownerId,
    note: example.note,
    status: "applied",
    demo: true,
    startAt: tryout.startAt,
    endAt: tryout.endAt,
    seenByOwner: true,
  }));
}
