import { AREAS } from "@/config/areas";

/** Lower case, letters and digits only, single spaces, with any extension number dropped. */
function normalise(area: string): string {
  return area
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s(ext|extension|x)\s?\d+$/, "")
    .trim();
}

const LOOKUP = new Map(AREAS.flatMap(({ name, aliases }) => [name, ...aliases].map((spelling): [string, string] => [normalise(spelling), name])));

/**
 * The official name for a typed area ("ivory prk" and "Ivory Park Ext 2" are
 * both "Ivory Park"), so the same place is always stored the same way. An
 * area we don't know is kept exactly as typed.
 */
export function canonicaliseArea(typed: string): string {
  return LOOKUP.get(normalise(typed)) ?? typed;
}
