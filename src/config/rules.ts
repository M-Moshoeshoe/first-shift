/**
 * Every product rule in one place. docs/RULES.md explains each one in plain
 * language; the domain functions read these values and never hard-code them.
 */
export const RULES = {
  /** National minimum wage from 1 March 2026, in cents per hour. */
  minimumWageCentsPerHour: 3023,
  /** Anyone who works under four hours must be paid for four. */
  minPaidHours: 4,
  maxTryoutHours: 8,

  /** A tryout must start at least this long after it is posted. */
  minNoticeMinutes: 120,
  /** Bookings close this long before the start, so the owner is never left stranded. */
  bookingCutoffMinutes: 60,
  /** Tryouts run in daylight only, in South African time. */
  daylightStartHour: 7,
  daylightEndHour: 18,
  /** South Africa has no daylight saving, so SAST is always UTC+2. */
  timezoneOffsetMinutes: 120,

  /** Cancelling is free up to this many hours before the start... */
  freeCancelBeforeStartHours: 12,
  /** ...and always free for this many minutes after booking. */
  freeCancelGraceMinutes: 15,
  /** Free cancellations that rely on the grace period, allowed per 30 days. */
  graceCancelsPer30Days: 3,

  /** After the start, an owner can mark a no-show once this much time has passed. */
  noShowAfterMinutes: 30,
  /** Check-in opens this long before the start, for someone who arrives early. */
  checkInOpensMinutesBefore: 60,
  /** Checked in within this long after the start counts as on time. */
  onTimeGraceMinutes: 10,
  /** Wrong check-in codes allowed on one booking before it locks, so a code can't be guessed. */
  checkInCodeAttempts: 5,
  /** Demo only: "Skip to the day" moves a demo booking to start this long ago, so the young person is on time. */
  demoSkipStartsMinutesAgo: 5,
  /** Demo only: the whole demo world can be reset from the app at most once in this many seconds, by anyone. */
  demoResetCooldownSeconds: 60,

  strikeWindowDays: 90,
  strikesToSuspend: 3,

  /**
   * Payment is due at check-out. An owner who hasn't marked the tryout paid
   * by this South African time on the same day is paused.
   */
  ownerPayDeadlineSast: { hour: 23, minute: 59 },
  /** If the young person hasn't confirmed payment, remind them at this point... */
  payConfirmReminderHours: 24,
  /** ...and send the tryout to review at this point. */
  payConfirmReviewHours: 72,

  applicationsPerDay: 10,
  postsPerDay: 5,
  /** Demo sign-ins (one tap or email) from one network address in each window, so nobody can flood the route. */
  demoSignInsPerWindow: 30,
  demoSignInWindowMinutes: 10,

  hirePromptAfterTryouts: 3,
  /** A job offer: the role in a few words, the days a week, and an optional personal message. */
  jobRoleMaxChars: 60,
  jobDaysPerWeekMax: 6,
  jobMessageMaxChars: 300,
  /**
   * From this many hours a month with the same employer, UIF and the BCEA's
   * working-time and leave chapters apply in full (docs/COMPLIANCE.md). A
   * booking that would reach it is refused: that's a job, not a tryout.
   */
  regularEmploymentHoursPerMonth: 24,
  /** Prepaid tryout credits: each completed tryout uses one, bought at this price. */
  creditPriceCents: 2500,
  /** Granted once, when a business profile is first complete. */
  freeCredits: 3,
  /** The most credits an admin can add in one grant (npm run credits:grant), so a typo can't add thousands. */
  adminGrantMaxCredits: 50,
  minimumAge: 18,

  /** Profile and shopfront photos. storage.rules enforces the same limits on upload. */
  photoMaxBytes: 2 * 1024 * 1024,
  photoContentTypes: ["image/jpeg", "image/png", "image/webp"],

  /** A premises pin counts only if the phone reports it to within this many metres. */
  pinMaxAccuracyMetres: 150,
  /**
   * Tryouts carry a geohash cell this long (6 characters, about 1 km) and its
   * centre. The exact pin stays on the business record.
   */
  coarseGeohashPrecision: 6,
  /** How far the nearby feed looks from the young person's area centre. */
  nearbyRadiusKm: 10,
  /** The note a young person may add when applying. */
  applicationNoteMaxChars: 200,
  /** The reference an owner may add when paying electronically, as their bank shows it. */
  paymentReferenceMaxChars: 40,
  /** The young person's one-line introduction on the owner's shortlist. */
  introMaxChars: 120,
  /** Kinds of work a young person can say they do ("What I can do"). */
  skillsMax: 4,
  /** The note that goes with a screenshot added after "Not received". */
  evidenceNoteMaxChars: 500,
  /** A screenshot added after "Not received": the photo limits, at a size a banking screen stays readable. */
  evidenceMaxEdgePx: 1600,

  /** Below this confidence, a work classification goes to human review. */
  workClassificationMinConfidence: 0.7,
} as const;
