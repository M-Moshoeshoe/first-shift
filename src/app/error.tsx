"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Band } from "@/components/ui/Band";
import { Button, buttonClass } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/PageTitle";
import { BUTTON_LABELS } from "@/domain/buttonLabels";

interface ErrorPageProps {
  error: unknown;
  /** Re-fetches and re-renders the page (Next.js error.js convention). */
  retry: () => void;
}

/**
 * An unexpected error on any page: never a blank or default screen. It says
 * what happened, offers Try again first, and a way home. Server errors arrive
 * with a digest only, never their details.
 */
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;
    console.error("page_error", digest ?? (error instanceof Error ? error.name : "unknown"));
  }, [error]);

  return (
    <PageShell>
      <Band tone="paper">
        <div role="alert">
          <PageTitle title="This page stopped working" intro={`Tap ${BUTTON_LABELS.tryAgain}. If it keeps happening, start again from the home page.`} />
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={retry}>{BUTTON_LABELS.tryAgain}</Button>
          <Link href="/" className={buttonClass("secondary")}>
            {BUTTON_LABELS.goHome}
          </Link>
        </div>
      </Band>
    </PageShell>
  );
}
