/** Money is always held as whole cents to avoid floating-point errors. */
export type Cents = number;

export function formatRand(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.round(cents));
  const rands = Math.floor(absolute / 100).toLocaleString("en-US");
  const remainder = String(absolute % 100).padStart(2, "0");
  return `${sign}R${rands}.${remainder}`;
}

export function multiplyCents(centsPerUnit: Cents, units: number): Cents {
  return Math.round(centsPerUnit * units);
}

/**
 * What a person typed as an amount in rand ("30.23", "R30,23", " 35 "), in
 * cents. Null for anything that isn't a plain amount with at most two decimals.
 */
export function parseRand(typed: string): Cents | null {
  const match = /^\s*R?\s*(\d{1,6})(?:[.,](\d{1,2}))?\s*$/i.exec(typed);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
}
