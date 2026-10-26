"use client";

import { useState, type ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { FormError } from "@/components/ui/FormError";
import type { DemoRole } from "@/config/demo";
import { BUTTON_LABELS } from "@/domain/buttonLabels";

const ERROR_ID = "demo-choice-error";

const ROLES: readonly { role: DemoRole; label: string; line: string }[] = [
  { role: "young_person", label: BUTTON_LABELS.tryAsThabo, line: "Find tryouts near Ivory Park, apply, and build a work record." },
  { role: "business", label: BUTTON_LABELS.tryAsSipho, line: "Post a tryout, book Thabo, pay them, and offer a job." },
];

/**
 * The judges' way in, apart from real sign-in: one tap to either demo account,
 * no password to type (lib/auth/signInWithDemo.ts). The sign-in code loads
 * only on tap, so the page stays light. Once signed in, SignInPanel sends them
 * on as for Google. The testers' email form sits underneath (children).
 */
export function DemoChoice({ children }: { children?: ReactNode }) {
  const [busy, setBusy] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (role: DemoRole) => {
    if (busy) return;
    setBusy(role);
    setError(null);
    const { tryDemo } = await import("@/lib/auth/signInWithDemo");
    const result = await tryDemo(role);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
    }
  };

  return (
    <section id="demo" aria-labelledby="demo-heading" className="flex flex-col gap-3 bg-mist p-4">
      <h2 id="demo-heading" className="text-xl">
        Explore with a demo account: tap Thabo or Sipho.
      </h2>
      {ROLES.map(({ role, label, line }) => (
        <button
          key={role}
          type="button"
          aria-busy={busy === role || undefined}
          aria-describedby={ERROR_ID}
          onClick={() => void choose(role)}
          className="lift flex min-h-16 w-full items-center gap-3 border border-line bg-paper p-3 text-left transition-transform duration-(--dur-fast) active:scale-97"
        >
          <BrandMark height={28} />
          <span className="flex flex-col">
            <span className="text-base font-semibold">{busy === role ? "Signing in" : label}</span>
            <span className="text-sm text-muted">{line}</span>
          </span>
        </button>
      ))}
      <FormError id={ERROR_ID} message={error} />
      <p className="text-sm text-muted">Made-up people and businesses. Nothing you do reaches real users.</p>
      {children}
    </section>
  );
}
