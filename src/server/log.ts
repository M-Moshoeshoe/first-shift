import "server-only";

type Level = "info" | "warn" | "error";

/** Fields that may hold personal information are never written to logs. */
const REDACTED_KEYS = new Set([
  "idNumber",
  "idHash",
  "idLastFour",
  "dateOfBirth",
  "phone",
  "payoutPhone",
  "email",
  "firstName",
  "name",
  "location",
  "text",
  "description",
  "note",
]);

function redact(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, REDACTED_KEYS.has(key) ? "[redacted]" : value]));
}

/** Structured, single-line JSON logs so failures are never silent and never leak personal data. */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...redact(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else process.stdout.write(`${line}\n`);
}
