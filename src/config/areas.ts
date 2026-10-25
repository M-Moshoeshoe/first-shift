/**
 * Known areas for the pilot, offered as suggestions in every area field (a
 * native <datalist>, so it costs no JavaScript). Anyone can still type an area
 * that isn't here. Aliases are typed variants that domain/areas.ts maps to the
 * official name; matching ignores case, punctuation, spacing and extension
 * numbers ("Ivory Park Ext 2"), so list only spellings that differ beyond that.
 *
 * Each centre is the area's approximate middle, from its Wikipedia
 * coordinates (25 October 2026): a young person's search point for nearby
 * tryouts, never anyone's address.
 */
export const AREAS: readonly { name: string; aliases: readonly string[]; centre: { lat: number; lng: number } }[] = [
  { name: "Alexandra", aliases: ["alex"], centre: { lat: -26.1038, lng: 28.0962 } },
  { name: "Diepsloot", aliases: [], centre: { lat: -25.9347, lng: 28.0125 } },
  { name: "Ebony Park", aliases: [], centre: { lat: -25.999, lng: 28.177 } },
  { name: "Halfway House", aliases: [], centre: { lat: -25.993, lng: 28.132 } },
  { name: "Ivory Park", aliases: ["ivory prk", "ivorypark"], centre: { lat: -25.999, lng: 28.196 } },
  { name: "Kaalfontein", aliases: [], centre: { lat: -26.0353, lng: 28.2544 } },
  { name: "Kempton Park", aliases: ["kempton"], centre: { lat: -26.1, lng: 28.233 } },
  { name: "Midrand", aliases: ["mid rand"], centre: { lat: -25.9992, lng: 28.1264 } },
  { name: "Olifantsfontein", aliases: ["olifantsfontain"], centre: { lat: -25.9581, lng: 28.2164 } },
  { name: "Rabie Ridge", aliases: [], centre: { lat: -26.022, lng: 28.174 } },
  { name: "Tembisa", aliases: ["thembisa", "tembisa township"], centre: { lat: -26.0055, lng: 28.2102 } },
];
