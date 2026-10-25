"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { FEED_COPY } from "@/domain/findingMessages";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { NearbyList } from "./NearbyList";
import { TryoutExplainer } from "./TryoutExplainer";

/** A young person's home: paid tryouts near their area, and on a first visit what a tryout is. Focus starts on the title. */
export function WorkHome() {
  const { worker } = useGatedProfile();
  const heading = useHeadingFocus(true);
  return (
    <>
      <PageTitle headingRef={heading} title={FEED_COPY.title} intro={worker?.area ? FEED_COPY.intro(worker.area) : undefined} />
      {worker && !worker.payMethods?.length ? (
        <section aria-labelledby="pay-methods-missing" className="flex flex-col gap-3 border-2 border-ink p-4">
          <h2 id="pay-methods-missing" className="text-xl font-bold">
            {FEED_COPY.payMethodsMissingTitle}
          </h2>
          <p className="text-lg">{FEED_COPY.payMethodsMissing}</p>
          <Link href="/work/profile" className={buttonClass("secondary")}>
            {FEED_COPY.openProfile}
          </Link>
        </section>
      ) : null}
      <TryoutExplainer />
      <NearbyList />
    </>
  );
}
