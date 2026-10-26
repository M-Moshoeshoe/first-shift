"use client";

import Link from "next/link";
import { SummaryBand } from "@/components/SummaryBand";
import { buttonClass } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { FEED_COPY } from "@/domain/findingMessages";
import { greetingFor } from "@/domain/greeting";
import { useGatedProfile } from "@/lib/auth/gatedProfile";
import { useHeadingFocus } from "@/lib/useHeadingFocus";
import { useNearbyTryouts } from "@/lib/useNearbyTryouts";
import { NearbyList } from "./NearbyList";
import { TryoutExplainer } from "./TryoutExplainer";

/** A young person's home: paid tryouts near their area, and on a first visit what a tryout is. Focus starts on the title. */
export function WorkHome() {
  const { worker } = useGatedProfile();
  const heading = useHeadingFocus(true);
  const feed = useNearbyTryouts();
  const near = feed.data?.status === "ok" ? feed.data.items.length : null;
  return (
    <>
      <PageTitle headingRef={heading} title={worker?.firstName ? `${greetingFor(new Date())}, ${worker.firstName}` : FEED_COPY.title} />
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
      {/* Real counts only: the feed just loaded and the record's own counter. */}
      {worker && near !== null ? (
        <SummaryBand
          label="Your week"
          figures={[
            { label: "Tryouts near you", value: near },
            { label: "Tryouts done", value: worker.tryoutsDone ?? 0 },
          ]}
        />
      ) : null}
      <TryoutExplainer />
      <section aria-labelledby="feed-heading" className="flex flex-col gap-4">
        <h2 id="feed-heading" className="text-xl">
          {worker?.area ? FEED_COPY.near(worker.area) : FEED_COPY.title}
        </h2>
        <NearbyList feed={feed} />
      </section>
    </>
  );
}
