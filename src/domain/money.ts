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
