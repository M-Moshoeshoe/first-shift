import type { Destination } from "@/domain/profile";

/** Lines of text at 360 px and at the desktop column width: each skeleton line stands in for one. */
type Lines = { phone: number; desktop: number };

interface Spec {
  title: Lines;
  intro: Lines;
  body: "role" | "form" | "none";
}

// Line counts measured on the real screens at 360 px and in the 1280 px desktop column; npm run e2e:browser
// checks each skeleton against its screen to within 2 px, so nothing jumps when the profile arrives.
const SPECS: Partial<Record<Destination, Spec>> = {
  "/onboarding/role": { title: { phone: 2, desktop: 2 }, intro: { phone: 2, desktop: 2 }, body: "role" },
  "/onboarding/work": { title: { phone: 1, desktop: 1 }, intro: { phone: 2, desktop: 2 }, body: "form" },
  "/onboarding/business": { title: { phone: 2, desktop: 1 }, intro: { phone: 3, desktop: 2 }, body: "form" },
  "/work": { title: { phone: 1, desktop: 1 }, intro: { phone: 2, desktop: 1 }, body: "none" },
  "/business": { title: { phone: 1, desktop: 1 }, intro: { phone: 2, desktop: 1 }, body: "none" },
};

const block = "animate-skeleton bg-mist";

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
  const spec = SPECS[path as Destination] ?? SPECS["/work"];
  if (!spec) return null;
  return (
    <div role="status" aria-label="Loading your page" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <LineBars lines={spec.title} lineClass="h-11.25" barClass="h-9" />
        </div>
        <div>
          <LineBars lines={spec.intro} lineClass="h-7" barClass="h-5" />
        </div>
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
    </div>
  );
}
