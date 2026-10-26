import type { Scene } from "./ScenePhoto";

/*
 * The scene photos, all taken in South Africa, from Pexels under the Pexels
 * licence (docs/CREDITS.md). Alt text says what is visible and nothing more.
 */
export const SCENES = {
  stalls: { name: "street-stalls-morning", height: 853, alt: "Street vendors in aprons set up their stalls on a city pavement in early morning sun, with minibus taxis parked behind them." },
  tailor: { name: "tailor-sewing-machine", height: 853, alt: "A tailor works at a sewing machine on a wooden bench in a corrugated iron workshop, in black and white." },
  corner: { name: "city-street-corner", height: 720, alt: "Vendors sell fruit from a trolley and a pavement mat on a busy city street corner on a sunny day." },
} as const satisfies Record<string, Scene>;
