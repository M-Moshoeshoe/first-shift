/**
 * Demo data for judges and testers. Every record is marked demo: true and the
 * seed script refuses to write it anywhere but the emulator or a demo project.
 */
export const DEMO_BUSINESS = {
  id: "demo-business-sipho",
  ownerId: "demo-owner-sipho",
  name: "Sipho's Phone Repairs",
  area: "Ivory Park",
  openingHours: "Monday to Saturday, 8:00 to 17:00",
  demo: true,
} as const;

export const DEMO_WORKERS = [
  { id: "demo-worker-thabo", firstName: "Thabo", area: "Ivory Park", completed: 4, onTime: 4, lateCancellations: 0, noShows: 0, demo: true },
  { id: "demo-worker-lerato", firstName: "Lerato", area: "Tembisa", completed: 2, onTime: 1, lateCancellations: 1, noShows: 0, demo: true },
  { id: "demo-worker-ayanda", firstName: "Ayanda", area: "Ivory Park", completed: 0, onTime: 0, lateCancellations: 0, noShows: 0, demo: true },
] as const;

/** One tryout at each stage, so a single judge can walk the whole loop. */
export const DEMO_TRYOUT_STAGES = ["published", "has_applicants", "booked", "awaiting_payment", "completed"] as const;
