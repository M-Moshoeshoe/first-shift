/**
 * Motion 6 for /work and /business: blocks the size of the greeting, the
 * note under it and the Sign out button, so nothing jumps when they load.
 */
export function HomeSkeleton() {
  const block = "animate-skeleton bg-mist";
  return (
    <div role="status" aria-label="Loading your page" className="flex flex-col gap-4">
      <div className={`h-10 w-3/4 ${block}`} />
      <div className={`h-7 ${block}`} />
      <div className={`mt-2 h-11 ${block}`} />
    </div>
  );
}
