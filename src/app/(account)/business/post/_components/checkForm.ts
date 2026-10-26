import { RULES } from "@/config/rules";
import { multiplyCents, parseRand, type Cents } from "@/domain/money";
import { checkTerms, type TermsProblem } from "@/domain/tryoutDecisions";
import { TERMS_MESSAGES, TRYOUT_FIELD_MESSAGES } from "@/domain/tryoutMessages";
import { PostTryoutSchema, type PostTryoutInput } from "@/schemas/tryout";

/** The "Check your tryout" form as the owner edits it. The rate stays as typed until it's sent. */
export interface CheckDraft {
  title: string;
  tasks: string[];
  date: string;
  startTime: string;
  hours: number;
  rate: string;
  supervision: boolean;
}

export const CHECK_FIELDS = ["title", "tasks", "date", "startTime", "hours", "rate", "supervision"] as const;
export type CheckField = (typeof CHECK_FIELDS)[number];
export type CheckErrors = Partial<Record<CheckField, string>>;

/** The hours a tryout can be, as chips: 4, 5, 6, 7, 8. */
export const HOUR_CHOICES = Array.from({ length: RULES.maxTryoutHours - RULES.minPaidHours + 1 }, (_, index) => RULES.minPaidHours + index);
export const MAX_TASKS = 6;

/** The minimum wage as the rate field starts: "30.23". */
export const MINIMUM_RATE_TEXT = (RULES.minimumWageCentsPerHour / 100).toFixed(2);

/** Where each rule problem shows, next to the field that fixes it. */
const PROBLEM_FIELD: Record<TermsProblem, CheckField> = {
  invalid_date: "date",
  invalid_time: "startTime",
  too_soon: "startTime",
  outside_daylight: "startTime",
  spans_days: "startTime",
  invalid_hours: "hours",
  ends_before_start: "hours",
  too_short: "hours",
  too_long: "hours",
  below_minimum_wage: "rate",
};

/**
 * The draft as a form, from its first version: the day the owner named, or no date for them to choose
 * (domain/draftDate.ts), 09:00, the suggested hours and the minimum wage. The
 * owner changes any of it.
 */
export function initialCheck(draft: { options: readonly { title: string; tasks: readonly string[] }[]; hours: number; date: string | null }): CheckDraft {
  const [first] = draft.options;
  return { title: first?.title ?? "", tasks: [...(first?.tasks ?? [])].slice(0, MAX_TASKS), date: draft.date ?? "", startTime: "09:00", hours: draft.hours, rate: MINIMUM_RATE_TEXT, supervision: false };
}

/** The day's pay at the typed rate, for the live line; null while the rate isn't a number yet. */
export function dayPay(form: Pick<CheckDraft, "rate" | "hours">): Cents | null {
  const rate = parseRand(form.rate);
  return rate === null ? null : multiplyCents(rate, form.hours);
}

/**
 * The same checks the server runs, for instant feedback: the shape of each
 * field, then the rules (domain/tryoutDecisions.ts, checkTerms). The server
 * checks everything again when the tryout is posted.
 */
export function checkForm(form: CheckDraft, description: string, now: Date): { errors: CheckErrors; input: PostTryoutInput | null } {
  const errors: CheckErrors = {};
  const rate = parseRand(form.rate);
  if (rate === null) errors.rate = TRYOUT_FIELD_MESSAGES.rate;

  const input = { description, title: form.title, tasks: form.tasks, date: form.date, startTime: form.startTime, hours: form.hours, rateCentsPerHour: rate ?? 0, supervisionConfirmed: form.supervision };
  const shape = PostTryoutSchema.safeParse(input);
  if (!shape.success) {
    for (const issue of shape.error.issues) {
      const key = issue.path[0];
      const field: CheckField | null = key === "supervisionConfirmed" ? "supervision" : key === "rateCentsPerHour" ? "rate" : CHECK_FIELDS.find((name) => name === key) ?? null;
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }

  const terms = checkTerms(now, { date: form.date, startTime: form.startTime, hours: form.hours, rateCentsPerHour: rate ?? RULES.minimumWageCentsPerHour });
  if (!terms.ok) {
    for (const problem of terms.error) {
      const field = PROBLEM_FIELD[problem];
      if (!errors[field]) errors[field] = TERMS_MESSAGES[problem];
    }
  }

  const valid = Object.keys(errors).length === 0 && shape.success;
  return { errors, input: valid ? shape.data : null };
}
