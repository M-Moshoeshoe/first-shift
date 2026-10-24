import { RULES } from "@/config/rules";
import type { Cents } from "./money";

/** Shown to each business as fees due. Nothing is collected during the hackathon. */
export function feesDueCents(completedTryouts: number): Cents {
  return Math.max(0, Math.floor(completedTryouts)) * RULES.feeCentsPerCompletedTryout;
}
