"use client";

import Link from "next/link";
import { useState } from "react";
import { SummaryBand } from "@/components/SummaryBand";
import { buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { creditsLine, greetingFor } from "@/domain/greeting";
import { PAUSE_COPY } from "@/domain/tryoutMessages";
import { useAuth } from "@/lib/auth/useAuth";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { useOwnTryouts } from "@/lib/useOwnTryouts";
import { CreditsPanel } from "./CreditsPanel";
import { TryoutList } from "./TryoutList";

/** The owner's dashboard: their credits, the one primary action, and their tryouts, live. Focus starts on the business name. */
export function BusinessHome() {
  const { business } = useGatedProfile();
  const { user } = useAuth();
  const heading = useHeadingFocus(true);
  const [attempt, setAttempt] = useState(0);
  const list = useOwnTryouts(user?.uid ?? null, attempt);
  const live = list.status === "ready" ? list.tryouts.filter((tryout) => tryout.status === "published") : [];
  return (
    <>
      <PageTitle
        headingRef={heading}
        title={business?.name ? `${greetingFor(new Date())}, ${business.name}` : undefined}
        intro={business && business.credits.available === 0 ? creditsLine(0, false) : undefined}
      />
      {/* Real counts only: the live list of their tryouts and their credit ledger. */}
      {business && list.status === "ready" ? (
        <SummaryBand
          label="Your business today"
          figures={[
            { label: "Live tryouts", value: live.length },
            { label: "Applicants waiting", value: live.reduce((sum, tryout) => sum + tryout.applicants, 0) },
            { label: business.credits.onlyFree ? "Free tryouts left" : "Credits ready", value: business.credits.available },
          ]}
        />
      ) : null}
      {business?.pause ? (
        // Why it's paused and what lifts it; posting waits until then (docs/RULES.md, Strikes, pauses and limits).
        <section aria-labelledby="paused" className="flex flex-col gap-3 border border-stop p-4">
          <h2 id="paused" className="text-xl font-bold">
            {PAUSE_COPY.title}
          </h2>
          {business.pause.reason === "other" ? <FormError message={PAUSE_COPY.other} /> : <p className="text-base">{PAUSE_COPY[business.pause.reason]}</p>}
          {business.pause.bookingId ? (
            <Link href={`/bookings/${business.pause.bookingId}`} className={buttonClass("primary")}>
              {PAUSE_COPY.openBooking}
            </Link>
          ) : null}
        </section>
      ) : business && !business.owner.ready ? (
        // A business from before the owner was asked: posting waits for them (tryoutDecisions.ts, owner_missing).
        <section aria-labelledby="owner-missing" className="flex flex-col gap-3 border border-line p-4">
          <h2 id="owner-missing" className="text-xl font-bold">
            Add your details as the owner
          </h2>
          <p className="text-base">Young people you book will see your first name, your photo and your number. You can post tryouts once it&apos;s done.</p>
          <Link href="/business/owner" className={buttonClass("primary")}>
            Add my details
          </Link>
        </section>
      ) : (
        <Link href="/business/post" className={buttonClass("primary")}>
          Post a tryout
        </Link>
      )}
      <section aria-labelledby="your-tryouts" className="flex flex-col gap-4">
        <h2 id="your-tryouts" className="text-xl font-bold">
          Your tryouts
        </h2>
        <TryoutList list={list} onRetry={() => setAttempt((count) => count + 1)} />
      </section>
      {business ? <CreditsPanel /> : null}
    </>
  );
}
