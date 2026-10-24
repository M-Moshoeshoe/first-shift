/**
 * Known areas for the pilot, offered as suggestions in every area field (a
 * native <datalist>, so it costs no JavaScript). Anyone can still type an area
 * that isn't here. Aliases are typed variants that domain/areas.ts maps to the
 * official name; matching ignores case, punctuation, spacing and extension
 * numbers ("Ivory Park Ext 2"), so list only spellings that differ beyond that.
 */
export const AREAS: readonly { name: string; aliases: readonly string[] }[] = [
  { name: "Alexandra", aliases: ["alex"] },
  { name: "Diepsloot", aliases: [] },
  { name: "Ebony Park", aliases: [] },
  { name: "Halfway House", aliases: [] },
  { name: "Ivory Park", aliases: ["ivory prk", "ivorypark"] },
  { name: "Kaalfontein", aliases: [] },
  { name: "Kempton Park", aliases: ["kempton"] },
  { name: "Midrand", aliases: ["mid rand"] },
  { name: "Olifantsfontein", aliases: ["olifantsfontain"] },
  { name: "Rabie Ridge", aliases: [] },
  { name: "Tembisa", aliases: ["thembisa", "tembisa township"] },
];
