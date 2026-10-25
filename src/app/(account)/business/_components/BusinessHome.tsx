"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
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
      <Link href="/business/post" className={buttonClass("primary")}>
        Post a tryout
      </Link>
      <section aria-labelledby="your-tryouts" className="flex flex-col gap-4">
        <h2 id="your-tryouts" className="text-xl font-bold">
          Your tryouts
        </h2>
        {user ? <TryoutList uid={user.uid} /> : null}
      </section>
    </>
  );
}
