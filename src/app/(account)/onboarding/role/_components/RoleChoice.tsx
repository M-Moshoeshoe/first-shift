"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { BUTTON_LABELS, PROFILE_MESSAGES } from "@/domain/messages";
import type { Role } from "@/domain/roles";
import { ApiError, apiPost } from "@/lib/api";
import { SaveResultSchema } from "@/schemas/profile";

const ERROR_ID = "role-error";
const CHOICES = [
  { role: "young_person", label: BUTTON_LABELS.lookingForWork, next: "/onboarding/work" },
  { role: "business", label: BUTTON_LABELS.runABusiness, next: "/onboarding/business" },
] as const satisfies readonly { role: Role; label: string; next: string }[];

/**
 * Two equal choices, so neither is the green primary. The role is set once on
 * the server; a double tap is ignored, and choosing the same role again is harmless.
 */
export function RoleChoice() {
  const router = useRouter();
  const [busyRole, setBusyRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (role: Role, next: string) => {
    if (busyRole) return;
    setBusyRole(role);
    setError(null);
    try {
      await apiPost("/api/profile/role", { role }, SaveResultSchema);
      router.replace(next);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : PROFILE_MESSAGES.fallback);
      setBusyRole(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {CHOICES.map((choice) => (
        <Button
          key={choice.role}
          variant="secondary"
          busy={busyRole === choice.role}
          busyLabel="Saving your choice"
          disabled={busyRole !== null && busyRole !== choice.role}
          aria-describedby={ERROR_ID}
          onClick={() => void choose(choice.role, choice.next)}
        >
          {choice.label}
        </Button>
      ))}
      <FormError id={ERROR_ID} message={error} />
    </div>
  );
}
