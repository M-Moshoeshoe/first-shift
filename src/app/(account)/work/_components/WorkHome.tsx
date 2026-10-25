"use client";

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
      <TryoutExplainer />
      <NearbyList />
    </>
  );
}
