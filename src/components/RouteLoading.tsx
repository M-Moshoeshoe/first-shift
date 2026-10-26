import { Band } from "./ui/Band";
import { ScreenSkeleton } from "./ScreenSkeleton";

/** A route segment's loading.tsx: the screen's own skeleton in its band, so a navigation never shows a blank page. */
export function RouteLoading({ path }: { path: string }) {
  return (
    <Band tone="paper">
      <ScreenSkeleton path={path} />
    </Band>
  );
}
