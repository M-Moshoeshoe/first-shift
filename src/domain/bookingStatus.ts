/** Where a booking stands. Its own module, so the public status page loads nothing else of the booking rules. */
export const BOOKING_STATUSES = ["booked", "checked_in", "ended", "no_show", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** How each status reads, on the booking page and the public status page. */
export const STATUS_LABELS: Record<BookingStatus, string> = {
  booked: "Booked",
  checked_in: "Checked in",
  ended: "Finished",
  no_show: "Did not go ahead",
  cancelled: "Cancelled",
};

/** The public status page's words (a trusted contact's view of "Share my trip"). */
export const STATUS_PAGE_COPY = {
  title: (name: string) => `${name}'s tryout`,
  at: (business: string, area: string) => `At ${business}, ${area}.`,
  // One message for an unknown link and an expired one, so a guessed link learns nothing.
  unavailable: "This link is not working. Status links stop at midnight on the day of the tryout; check you copied all of it.",
};
