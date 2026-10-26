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
      {worker && (!worker.payMethods?.length || !worker.skills?.length || !worker.languages?.length || !worker.hasSurname) ? (
        <section aria-labelledby="profile-update" className="flex flex-col gap-3 border border-line p-4">
          <h2 id="profile-update" className="text-xl font-bold">
            {FEED_COPY.profileUpdateTitle}
          </h2>
          <p className="text-base">{FEED_COPY.profileUpdate}</p>
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
