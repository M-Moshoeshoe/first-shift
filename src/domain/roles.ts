export const ROLES = ["young_person", "business"] as const;
export type Role = (typeof ROLES)[number];

export type RoleDecision = { kind: "create"; role: Role } | { kind: "unchanged" } | { kind: "refuse"; current: Role };

/**
 * A role is set once and never changed. Asking again for the role you
 * already have is fine and changes nothing, so a double tap is harmless.
 */
export function decideRole(current: Role | null, requested: Role): RoleDecision {
  if (current === null) return { kind: "create", role: requested };
  if (current === requested) return { kind: "unchanged" };
  return { kind: "refuse", current };
}
