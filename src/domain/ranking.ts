export interface Applicant {
  id: string;
  /** How well their stated experience fits the tasks, 0 to 1. */
  fit: number;
  /** Show-up likelihood score, 0 to 100. */
  showUpScore: number;
  /** Average rating out of 5, or null if they have none yet. */
  rating: number | null;
  distanceKm: number;
  completedTryouts: number;
}

export interface RankedApplicant extends Applicant {
  rankScore: number;
  /** True when this person holds the place kept for a first-timer. */
  firstTimerPlace: boolean;
}

const WEIGHTS = { fit: 0.4, showUp: 0.35, rating: 0.15, distance: 0.1 } as const;
const NEUTRAL_RATING = 3;
const DISTANCE_LIMIT_KM = 20;

export function rankScore(applicant: Applicant): number {
  const rating = (applicant.rating ?? NEUTRAL_RATING) / 5;
  const distance = Math.max(0, 1 - applicant.distanceKm / DISTANCE_LIMIT_KM);
  const score =
    WEIGHTS.fit * applicant.fit + WEIGHTS.showUp * (applicant.showUpScore / 100) + WEIGHTS.rating * rating + WEIGHTS.distance * distance;
  return Math.round(score * 1000) / 1000;
}

/**
 * Ranks applicants and always keeps one place for someone with no record,
 * because the whole point is giving people their first chance.
 */
export function shortlist(applicants: Applicant[], size = 5): RankedApplicant[] {
  const ranked = applicants
    .map((applicant) => ({ ...applicant, rankScore: rankScore(applicant), firstTimerPlace: false }))
    .sort((a, b) => b.rankScore - a.rankScore);

  const top = ranked.slice(0, size);
  const hasFirstTimer = top.some((applicant) => applicant.completedTryouts === 0);
  const bestFirstTimer = ranked.slice(size).find((applicant) => applicant.completedTryouts === 0);

  if (!hasFirstTimer && bestFirstTimer && top.length === size) {
    top[size - 1] = { ...bestFirstTimer, firstTimerPlace: true };
  }
  return top;
}
