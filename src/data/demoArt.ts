import type { DEMO_EXAMPLE_APPLICANTS, DEMO_EXAMPLE_OWNERS } from "@/config/demo";
import type { PhotoKind } from "@/domain/profile";
import type { DemoUids } from "./demo";

/**
 * Every demo face and shopfront, and the illustration drawn for it. This is
 * the one place a demo person or business is matched to its picture.
 * Illustrations drawn for First Shift, never photos of real people: the SVG
 * sources and their PNGs are in scripts/demoArt, which npm run demo:reset
 * uploads. "Reset the demo" in the app has no access to them, so it draws a
 * plain placeholder only where no photo is stored yet (server/demoPhotos.ts).
 */
export const DEMO_ART = [
  "thabo",
  "sipho",
  "naledi",
  "kagiso",
  "zanele",
  "lwazi",
  "palesa",
  "tumelo",
  "sipho-phone-repairs",
  "lerato-spaza",
  "ayanda-car-wash",
] as const;
export type DemoArt = (typeof DEMO_ART)[number];

export interface DemoPhoto {
  uid: string;
  kind: PhotoKind;
  art: DemoArt;
}

/** The six example applicants (data/demoApplicants.ts): Naledi, Kagiso, Zanele, Lwazi, Palesa and Tumelo. */
const APPLICANT_ART: Record<(typeof DEMO_EXAMPLE_APPLICANTS)[number], DemoArt> = {
  "demo-applicant-1": "naledi",
  "demo-applicant-2": "kagiso",
  "demo-applicant-3": "zanele",
  "demo-applicant-4": "lwazi",
  "demo-applicant-5": "palesa",
  "demo-applicant-6": "tumelo",
};

/** The two businesses with no account behind them (data/demo.ts). */
const OWNER_ART: Record<(typeof DEMO_EXAMPLE_OWNERS)[number], DemoArt> = {
  "demo-lerato": "lerato-spaza",
  "demo-ayanda": "ayanda-car-wash",
};

/** Thabo's and Sipho's faces, Sipho's shopfront, the example applicants' faces and the example businesses' shopfronts. */
export function demoPhotos(uids: DemoUids): DemoPhoto[] {
  return [
    { uid: uids.youngPerson, kind: "profile", art: "thabo" },
    { uid: uids.business, kind: "profile", art: "sipho" },
    { uid: uids.business, kind: "shopfront", art: "sipho-phone-repairs" },
    ...Object.entries(APPLICANT_ART).map(([uid, art]): DemoPhoto => ({ uid, kind: "profile", art })),
    ...Object.entries(OWNER_ART).map(([uid, art]): DemoPhoto => ({ uid, kind: "shopfront", art })),
  ];
}
