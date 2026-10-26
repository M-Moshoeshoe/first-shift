import type { ApplicationRecord } from "./applications";
import { areaCentre } from "./areas";
import { returnFare } from "./fares";
import { aboutHowFar, distanceKm } from "./nearby";
import type { UserRecord } from "./profile";
import { shortlist } from "./ranking";
import { predictShowUp, type ShowUpBand } from "./showUp";
import type { TryoutRecord } from "./tryoutDecisions";
import { LANGUAGE_LABELS, SKILL_LABELS } from "./profileCopy";
import { skillFit } from "./workerProfile";

// Fit is whether the young person says they can do this kind of work ("What I can do", workerProfile.ts),
// ranked with show-up likelihood and distance from their own record. Said plainly to the owner.

/** An area we can't place counts as this far away for ranking, and shows no distance. */
const UNKNOWN_DISTANCE_KM = 20;

export interface ApplicantInput {
  application: ApplicationRecord;
  worker: UserRecord;
  approvedReferences: number;
}

/** One applicant as the owner sees them: no ID details, no phone number until booked. */
export interface ApplicantView {
  workerId: string;
  firstName: string;
  area: string;
  distance: string | null;
  returnFareCents: number | null;
  completedTryouts: number;
  approvedReferences: number;
  note: string;
  /** "What I can do" and the languages, by name, so the owner's page needs no list of its own. */
  skills: string[];
  languages: string[];
  intro: string;
  /** This tryout's kind of work is one they say they can do. */
  canDoThisWork: boolean;
  status: "applied" | "offered";
  showUp: { score: number; band: ShowUpBand; reasons: string[] };
  /** Holds the shortlist place kept for someone with no record yet (ranking.ts). */
  firstTimerPlace: boolean;
  shortlisted: boolean;
}

/**
 * The owner's applicants, best first: the shortlist (with its first-timer
 * place) and then everyone else in rank order. Only open applications count.
 */
export function rankApplicants(tryout: TryoutRecord, inputs: readonly ApplicantInput[]): ApplicantView[] {
  const open = inputs.filter(({ application }) => application.status === "applied" || application.status === "offered");
  const prepared = open.map(({ application, worker, approvedReferences }) => {
    const centre = areaCentre(worker.area ?? "");
    const km = centre ? distanceKm(centre, tryout.location) : null;
    const fare = returnFare(worker.area ?? "", tryout.area)?.returnCents ?? null;
    const history = { completed: worker.completed ?? 0, onTime: worker.onTime ?? 0, lateCancellations: worker.lateCancellations ?? 0, noShows: worker.noShows ?? 0 };
    const showUp = predictShowUp(history, fare, tryout.payCents);
    return { application, worker, approvedReferences, km, fare, showUp };
  });
  const byId = new Map(prepared.map((item) => [item.application.workerId, item]));
  const ranking = prepared.map((item) => ({ id: item.application.workerId, fit: skillFit(item.worker.skills, tryout.category), showUpScore: item.showUp.score, rating: null, distanceKm: item.km ?? UNKNOWN_DISTANCE_KM, completedTryouts: item.worker.completed ?? 0 }));
  const top = shortlist(ranking);
  const topIds = new Set(top.map((entry) => entry.id));
  const rest = shortlist(ranking, ranking.length).filter((entry) => !topIds.has(entry.id));

  return [...top.map((entry) => ({ entry, shortlisted: true })), ...rest.map((entry) => ({ entry, shortlisted: false }))].flatMap(({ entry, shortlisted }) => {
    const item = byId.get(entry.id);
    if (!item) return [];
    const { application, worker } = item;
    const view: ApplicantView = {
      workerId: application.workerId,
      firstName: worker.firstName ?? "",
      area: worker.area ?? "",
      distance: item.km === null ? null : aboutHowFar(item.km),
      returnFareCents: item.fare,
      completedTryouts: worker.completed ?? 0,
      approvedReferences: item.approvedReferences,
      note: application.note,
      skills: (worker.skills ?? []).map((skill) => SKILL_LABELS[skill]),
      languages: (worker.languages ?? []).map((language) => LANGUAGE_LABELS[language]),
      intro: worker.intro ?? "",
      canDoThisWork: skillFit(worker.skills, tryout.category) === 1,
      status: application.status === "offered" ? "offered" : "applied",
      showUp: item.showUp,
      firstTimerPlace: entry.firstTimerPlace,
      shortlisted,
    };
    return [view];
  });
}
