export interface ShowUpHistory {
  completed: number;
  onTime: number;
  lateCancellations: number;
  noShows: number;
}

export type ShowUpBand = "high" | "medium" | "low" | "new";

export interface ShowUpPrediction {
  /** 0 to 100. */
  score: number;
  band: ShowUpBand;
  /** Plain-language reasons the owner sees next to the score. */
  reasons: string[];
}

const NEW_PERSON_BASE = 70;
const LATE_ARRIVAL_CREDIT = 0.7;

function farePenalty(fareCents: number | null, payCents: number): { points: number; reason?: string } {
  if (fareCents === null || payCents <= 0) return { points: 0 };
  const share = fareCents / payCents;
  const percent = Math.round(share * 100);
  if (share > 0.4) return { points: 20, reason: `The return fare is ${percent}% of the pay` };
  if (share > 0.25) return { points: 10, reason: `The return fare is ${percent}% of the pay` };
  return { points: 0 };
}

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Predicts how likely someone is to turn up on time, from their own history.
 * Transparent weights, no black box: every point of the score has a reason.
 */
export function predictShowUp(history: ShowUpHistory, fareCents: number | null, payCents: number): ShowUpPrediction {
  const fare = farePenalty(fareCents, payCents);
  const attempts = history.completed + history.noShows + history.lateCancellations;

  if (attempts === 0) {
    const reasons = ["First tryout, no record yet", ...(fare.reason ? [fare.reason] : [])];
    return { score: clamp(NEW_PERSON_BASE - fare.points), band: "new", reasons };
  }

  const lateArrivals = Math.max(0, history.completed - history.onTime);
  const reliability = (history.onTime + lateArrivals * LATE_ARRIVAL_CREDIT) / attempts;
  const score = clamp(reliability * 100 - fare.points);

  const reasons = [`On time for ${history.onTime} of ${history.completed} tryouts`];
  if (history.noShows > 0) reasons.push(`${history.noShows} no-show${history.noShows === 1 ? "" : "s"}`);
  if (history.lateCancellations > 0) {
    reasons.push(`${history.lateCancellations} late cancellation${history.lateCancellations === 1 ? "" : "s"}`);
  }
  if (fare.reason) reasons.push(fare.reason);

  const band: ShowUpBand = score >= 80 ? "high" : score >= 60 ? "medium" : "low";
  return { score, band, reasons };
}
