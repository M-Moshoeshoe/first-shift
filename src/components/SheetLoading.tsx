/**
 * The frame of a bottom sheet whose code is still loading, when it was tapped
 * before the idle-time preload finished: the scrim and a placeholder sheet at
 * once, so the tap never looks ignored. No motion beyond the skeleton's.
 */
export function SheetLoading() {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
      <div role="status" aria-label="Opening" className="w-full border border-b-0 border-line bg-paper px-5 pt-6 pb-8 lg:max-w-md">
        <div className="h-40 skeleton" />
      </div>
    </div>
  );
}
