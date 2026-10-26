import { SlipSkeleton } from "./SlipSkeleton";

/** Lines of text at 360 px and at the desktop column width: each skeleton line stands in for one. */
type Lines = { phone: number; desktop: number };

interface Spec {
  title: Lines;
  intro: Lines;
  body: "role" | "form" | "dashboard" | "feed";
  /** A screen with the role's links: from 1024 px they add a header row once the profile loads, so the skeleton keeps its place. */
  nav?: boolean;
}

// Line counts measured on the real screens at 360 px and in the 1280 px desktop column (v4 type, 26 October 2026); npm run e2e:browser
// checks each skeleton against its screen to within 2 px, so nothing jumps when the profile arrives.
// Keyed by address: the gated destinations and their own screens (domain/profile.ts, SCREENS_OF).
const SPECS: Record<string, Spec> = {
  "/onboarding/role": { title: { phone: 1, desktop: 1 }, intro: { phone: 2, desktop: 1 }, body: "role" },
  "/onboarding/work": { title: { phone: 1, desktop: 1 }, intro: { phone: 2, desktop: 2 }, body: "form" },
  "/onboarding/business": { title: { phone: 1, desktop: 1 }, intro: { phone: 3, desktop: 2 }, body: "form" },
  "/work": { title: { phone: 1, desktop: 1 }, intro: { phone: 0, desktop: 0 }, body: "feed", nav: true },
  "/business": { title: { phone: 2, desktop: 2 }, intro: { phone: 0, desktop: 0 }, body: "dashboard", nav: true },
  "/business/post": { title: { phone: 1, desktop: 1 }, intro: { phone: 3, desktop: 3 }, body: "form", nav: true },
};

const block = "skeleton";

/** One line of text: the bar sits inside a box the line's exact height. */
function LineBars({ lines, lineClass, barClass }: { lines: Lines; lineClass: string; barClass: string }) {
  const count = Math.max(lines.phone, lines.desktop);
  return Array.from({ length: count }, (_, index) => {
    const onPhone = index < lines.phone;
    const onDesktop = index < lines.desktop;
    const visibility = onPhone && !onDesktop ? "lg:hidden" : !onPhone && onDesktop ? "hidden lg:flex" : "";
    const last = index === count - 1;
    return (
      <div key={index} className={`flex items-center ${lineClass} ${visibility}`}>
        <div className={`${block} ${barClass} ${last ? "w-2/3" : "w-full"}`} />
      </div>
    );
  });
}

/** A field: label, optional one-line hint, and the 44 px input, 8 px apart (docs/DESIGN.md, Spacing). */
function FieldBars({ hint }: { hint: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-6 w-28 ${block}`} />
      {hint ? <div className={`h-5 w-3/4 ${block}`} /> : null}
      <div className={`h-11 ${block}`} />
    </div>
  );
}

/**
 * Motion 6: the loading placeholder for each gated screen, sized line by
 * line like the real one: the title, the sentence under it, then the first
 * controls. Never a spinner.
 */
export function ScreenSkeleton({ path }: { path: string }) {
  const spec = SPECS[path] ?? SPECS["/work"];
  if (!spec) return null;
  return (
    <div role="status" aria-label="Loading your page" className={`flex flex-col gap-6 ${spec.nav ? "lg:mt-11" : ""}`}>
      <div className="flex flex-col gap-2">
        <div>
          <LineBars lines={spec.title} lineClass="h-8 lg:h-10" barClass="h-6 lg:h-8" />
        </div>
        {/* The dashboards have no intro line: their summary band follows the title. */}
        {Math.max(spec.intro.phone, spec.intro.desktop) > 0 ? (
          <div>
            <LineBars lines={spec.intro} lineClass="h-6" barClass="h-4" />
          </div>
        ) : null}
      </div>
      {spec.body === "role" ? (
        <div className="flex flex-col gap-3">
          <div className={`h-11 ${block}`} />
          <div className={`h-11 ${block}`} />
        </div>
      ) : null}
      {spec.body === "form" ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className={`h-5 w-20 ${block}`} />
            <div className={`h-1 ${block}`} />
          </div>
          <div className="flex flex-col gap-4">
            <div className={`h-7 w-40 ${block}`} />
            <FieldBars hint={false} />
            <FieldBars hint />
          </div>
        </div>
      ) : null}
      {spec.body === "feed" ? (
        <div className="flex flex-col gap-4">
          <SlipSkeleton />
          <SlipSkeleton />
        </div>
      ) : null}
      {spec.body === "dashboard" ? (
        <div className="flex flex-col gap-6">
          <div className={`h-36 ${block}`} />
          <div className={`h-13 ${block}`} />
          <div className={`h-7 w-40 ${block}`} />
        </div>
      ) : null}
    </div>
  );
}
