import { decideWork, type BlockedCategory, type WorkCategory, type WorkDecision } from "./allowedWork";
import { canPost, type CreditEntry } from "./credits";
import type { Viewer } from "./demo";
import { coarseLocation, type CoarseLocation } from "./geo";
import type { Cents } from "./money";
import { agreedPayCents } from "./pay";
import { isProfileComplete, ownerReady, type BusinessRecord, type UserRecord } from "./profile";
import { fail, ok, type Result } from "./result";
import { validateTryoutWindow, type ScheduleProblem, type TryoutWindow } from "./schedule";
import { canTakePart } from "./strikes";
import { buildTryoutWindow, transition, type TryoutStatus, type WindowInputProblem } from "./tryout";

/** What the owner sends to post: the request, the reviewed draft, and the terms. */
export interface TryoutTerms {
  description: string;
  title: string;
  tasks: string[];
  date: string;
  startTime: string;
  hours: number;
  rateCentsPerHour: Cents;
}

/**
 * tryouts/{id}. Everything a young person needs to decide, and nothing more:
 * the business's area and a cell about 1 km across (geo.ts), never the exact
 * pin, which stays on the business record.
 */
export interface TryoutRecord {
  ownerId: string;
  businessName: string;
  area: string;
  shopfrontPhoto: string;
  location: CoarseLocation;
  title: string;
  tasks: string[];
  /** The work's category; null while a tryout waits for review, until someone classifies it. */
  category: WorkCategory | null;
  startAt: Date;
  endAt: Date;
  hours: number;
  rateCentsPerHour: Cents;
  payCents: Cents;
  status: TryoutStatus;
  /** Posted by a demo account: seen only by demo accounts (demo.ts). */
  demo: boolean;
  /** The offer waiting for an answer, if any (offers.ts). */
  offer?: { workerId: string; at: Date } | null;
  /** Set once someone accepts: the booking (bookings.ts). */
  bookingId?: string | null;
}

export type PostingProblem = "not_business" | "profile_incomplete" | "owner_missing" | "account_paused" | "no_credits";

/** Only a business with a complete, active profile, its owner's details and an available credit may draft or post. */
export function postingProblem(user: UserRecord | null, business: BusinessRecord | null, credits: readonly CreditEntry[]): PostingProblem | null {
  if (!user || user.role !== "business" || !business) return "not_business";
  if (!canTakePart(user.status) || !canTakePart(business.status)) return "account_paused";
  if (!isProfileComplete(user, business)) return "profile_incomplete";
  // A young person is told who they'll meet: a business from before the owner was asked adds them first (docs/RULES.md, Accountability).
  if (!ownerReady(user, business)) return "owner_missing";
  if (!canPost(credits)) return "no_credits";
  return null;
}

export type TermsProblem = WindowInputProblem | ScheduleProblem | "below_minimum_wage";

/**
 * The tryout's time and pay against every rule: notice, daylight, length and
 * the pay floor. All problems at once, so the owner fixes them in one go.
 * Length is reported once, by the schedule; the pay check adds only the floor.
 */
export function checkTerms(now: Date, terms: Pick<TryoutTerms, "date" | "startTime" | "hours" | "rateCentsPerHour">): Result<{ window: TryoutWindow; payCents: Cents }, TermsProblem[]> {
  const built = buildTryoutWindow(terms.date, terms.startTime, terms.hours);
  if (!built.ok) return fail([built.error]);
  const schedule = validateTryoutWindow(now, built.value);
  const problems: TermsProblem[] = schedule.ok ? [] : [...schedule.error];
  const pay = agreedPayCents(terms.rateCentsPerHour, terms.hours);
  if (!pay.ok && pay.error === "below_minimum_wage") problems.push("below_minimum_wage");
  if (problems.length > 0) return fail(problems);
  // The schedule already reports a length outside 4 to 8 hours, so pay can only fail here if the rules disagree.
  if (!pay.ok) return fail(["invalid_hours"]);
  return ok({ window: built.value, payCents: pay.value });
}

/** How the work check decides what happens to a post: live, waiting for review, or refused. */
export function postedStatus(work: WorkDecision): Result<{ status: "published" | "review"; category: WorkCategory | null }, { category: BlockedCategory; saferOption: string }> {
  if (work.decision === "blocked") return fail({ category: work.category, saferOption: work.saferOption });
  return ok(work.decision === "allowed" ? { status: "published", category: work.category } : { status: "review", category: null });
}

/** The record to store, marked demo when a demo account posts it. The business must be complete (postingProblem), so its pin and photo exist. */
export function newTryout(owner: Viewer, business: BusinessRecord, terms: TryoutTerms, decided: { window: TryoutWindow; payCents: Cents }, status: "published" | "review", category: WorkCategory | null): TryoutRecord | null {
  if (!business.name || !business.area || !business.location || !business.shopfrontPhoto) return null;
  return {
    ownerId: owner.uid,
    businessName: business.name,
    area: business.area,
    shopfrontPhoto: business.shopfrontPhoto.path,
    location: coarseLocation(business.location.latitude, business.location.longitude),
    title: terms.title.trim(),
    tasks: terms.tasks.map((task) => task.trim()).filter((task) => task.length > 0),
    category,
    startAt: decided.window.start,
    endAt: decided.window.end,
    hours: terms.hours,
    rateCentsPerHour: terms.rateCentsPerHour,
    payCents: decided.payCents,
    status,
    demo: owner.demo,
  };
}

export type WithdrawDecision = { kind: "withdraw" } | { kind: "unchanged" } | { kind: "refuse"; problem: "not_found" | "booked" | "finished" };

/**
 * The owner may withdraw a tryout nobody is booked on (tryout.ts, transition).
 * Someone else's tryout reads as not found, so ids can't be probed. Withdrawing
 * twice changes nothing, so a double tap is harmless.
 */
export function decideWithdraw(uid: string, tryout: TryoutRecord | null): WithdrawDecision {
  if (!tryout || tryout.ownerId !== uid) return { kind: "refuse", problem: "not_found" };
  if (tryout.status === "withdrawn") return { kind: "unchanged" };
  if (transition(tryout.status, "withdraw").ok) return { kind: "withdraw" };
  return { kind: "refuse", problem: tryout.status === "booked" ? "booked" : "finished" };
}

export type ReviewDecision =
  | { kind: "approve"; category: WorkCategory }
  | { kind: "reject" }
  | { kind: "refuse"; problem: "not_found" | "not_in_review" | "blocked_category" };

/**
 * A person checks a tryout the AI couldn't classify (scripts/reviewTryout.ts).
 * Approving names the kind of work, and only an allowed kind can go live: the
 * same rule as posting (allowedWork.ts), so a reviewer can't publish blocked work.
 */
export function decideReview(tryout: TryoutRecord | null, action: "approve" | "reject", category?: WorkCategory): ReviewDecision {
  if (!tryout) return { kind: "refuse", problem: "not_found" };
  if (!transition(tryout.status, action).ok) return { kind: "refuse", problem: "not_in_review" };
  if (action === "reject") return { kind: "reject" };
  if (!category || decideWork(category, 1).decision !== "allowed") return { kind: "refuse", problem: "blocked_category" };
  return { kind: "approve", category };
}
