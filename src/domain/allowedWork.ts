import { RULES } from "@/config/rules";

export const ALLOWED_CATEGORIES = [
  "customer_service",
  "stock_and_packing",
  "cleaning",
  "admin",
  "car_washing",
  "food_service",
  "stall_setup",
  "social_media",
] as const;

export const BLOCKED_CATEGORIES = [
  "electrical",
  "gas_or_plumbing",
  "licensed_trade",
  "driving_or_machinery",
  "working_at_heights",
  "cash_handling_alone",
  "security",
  "childcare_or_care",
  "hazardous_chemicals",
  "private_home",
  "overnight_or_alone",
] as const;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];
export type BlockedCategory = (typeof BLOCKED_CATEGORIES)[number];
export type WorkCategory = AllowedCategory | BlockedCategory;

const SAFER_OPTION: Record<BlockedCategory, string> = {
  electrical: "Electrical work must be done by a registered electrician. You could post help tidying the stockroom while they work.",
  gas_or_plumbing: "Gas and plumbing work needs a qualified tradesperson. You could post help clearing the area before they arrive.",
  licensed_trade: "Licensed trade work needs a qualified person. You could post the supporting tasks around it instead.",
  driving_or_machinery: "Tryouts cannot include driving or operating machinery. You could post loading or packing help instead.",
  working_at_heights: "Tryouts cannot include working at heights. You could post ground-level tasks instead.",
  cash_handling_alone: "Tryouts cannot include handling cash or the till alone. You could post serving customers with you at the till.",
  security: "Security work needs a registered security officer. You could post customer help at the door instead.",
  childcare_or_care: "Childcare and care work are not offered as tryouts. You could post other help around the business.",
  hazardous_chemicals: "Tryouts cannot involve hazardous chemicals. Cleaning with household products is fine.",
  private_home: "Tryouts happen at business premises only, never in a private home.",
  overnight_or_alone: "Tryouts happen in daylight, with you on site.",
};

export type WorkDecision =
  | { decision: "allowed"; category: AllowedCategory }
  | { decision: "blocked"; category: BlockedCategory; saferOption: string }
  | { decision: "review"; reason: string };

const isAllowed = (category: WorkCategory): category is AllowedCategory =>
  (ALLOWED_CATEGORIES as readonly string[]).includes(category);

/** The AI only classifies. This function, not the model, decides what may be posted. */
export function decideWork(category: WorkCategory, confidence: number): WorkDecision {
  if (!isAllowed(category)) return { decision: "blocked", category, saferOption: SAFER_OPTION[category] };
  if (confidence < RULES.workClassificationMinConfidence) {
    return { decision: "review", reason: "We could not tell what kind of work this is, so someone will check it before it goes live." };
  }
  return { decision: "allowed", category };
}
