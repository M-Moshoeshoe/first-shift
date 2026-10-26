"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PageTitle } from "@/components/ui/PageTitle";
import { PAUSE_COPY } from "@/domain/tryoutMessages";
import { useAuth } from "@/lib/auth/useAuth";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { CreditsPanel } from "./CreditsPanel";
import { TryoutList } from "./TryoutList";

/** The owner's dashboard: their credits, the one primary action, and their tryouts, live. Focus starts on the business name. */
export function BusinessHome() {
  const { business } = useGatedProfile();
  const { user } = useAuth();
  const heading = useHeadingFocus(true);
  return (
    <>
      <PageTitle headingRef={heading} title={business?.name} intro={business?.area} />
      {business ? <CreditsPanel available={business.credits.available} onlyFree={business.credits.onlyFree} /> : null}
      {business?.pause ? (
        // Why it's paused and what lifts it; posting waits until then (docs/RULES.md, Strikes, pauses and limits).
        <section aria-labelledby="paused" className="flex flex-col gap-3 border-2 border-stop p-4">
          <h2 id="paused" className="text-xl font-bold">
            {PAUSE_COPY.title}
          </h2>
          {business.pause.reason === "other" ? <FormError message={PAUSE_COPY.other} /> : <p className="text-lg">{PAUSE_COPY[business.pause.reason]}</p>}
          {business.pause.bookingId ? (
            <Link href={`/bookings/${business.pause.bookingId}`} className={buttonClass("primary")}>
              {PAUSE_COPY.openBooking}
            </Link>
          ) : null}
        </section>
      ) : business && !business.owner.ready ? (
        // A business from before the owner was asked: posting waits for them (tryoutDecisions.ts, owner_missing).
        <section aria-labelledby="owner-missing" className="flex flex-col gap-3 border-2 border-ink p-4">
          <h2 id="owner-missing" className="text-xl font-bold">
            Add your details as the owner
          </h2>
          <p className="text-lg">Young people you book will see your first name, your photo and your number. You can post tryouts once it&apos;s done.</p>
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
        {user ? <TryoutList uid={user.uid} /> : null}
      </section>
    </>
  );
}
