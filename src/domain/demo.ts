import { DEMO_EMAIL_DOMAIN, DEMO_EXAMPLE_APPLICANTS, DEMO_EXAMPLE_OWNERS } from "@/config/demo";

/**
 * Who is asking: the signed-in uid, and whether it's one of the demo accounts
 * (the demo claim on the ID token, which only the server can set).
 */
export interface Viewer {
  uid: string;
  demo: boolean;
}

/**
 * Demo and real never meet. Every record a demo account creates is marked
 * demo, and a demo account sees and touches only demo records, while real
 * people see and touch only real ones. A record stored before demo marking
 * existed has no flag and counts as real.
 */
export const sameWorld = (viewer: Pick<Viewer, "demo">, record: { demo?: boolean }): boolean => viewer.demo === (record.demo === true);

/** A tryout from a demo business with no account behind it: shown as an example, never open to applications. */
export const isExampleOwner = (ownerId: string): boolean => DEMO_EXAMPLE_OWNERS.some((owner) => owner === ownerId);

/** One of the demo's made-up applicants, who can be looked at but never offered a tryout (src/config/demo.ts). */
export const isExampleApplicant = (workerId: string): boolean => DEMO_EXAMPLE_APPLICANTS.some((applicant) => applicant === workerId);

/** A demo account's email must stay on the demo domain; one moved anywhere else is refused (signIn.ts). */
export const isDemoEmail = (email: string | undefined): boolean => typeof email === "string" && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
