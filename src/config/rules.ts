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

  hirePromptAfterTryouts: 3,
  /** Prepaid tryout credits: each completed tryout uses one, bought at this price. */
  creditPriceCents: 2500,
  /** Granted once, when a business profile is first complete. */
  freeCredits: 3,
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

  /** Below this confidence, a work classification goes to human review. */
  workClassificationMinConfidence: 0.7,
} as const;
