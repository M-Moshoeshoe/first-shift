/**
 * Motion 6, shared by both onboarding forms: placeholder blocks the size of
 * the first form step (progress, label and input, a group, the button), so
 * nothing jumps when the profile arrives. Never a blank screen or a spinner.
 */
export function FormSkeleton() {
  const block = "animate-skeleton bg-mist";
  return (
    <div role="status" aria-label="Loading your profile" className="flex flex-col gap-6">
      <div className={`h-6 ${block}`} />
      <div className="flex flex-col gap-1">
        <div className={`h-6 w-28 ${block}`} />
        <div className={`h-11 ${block}`} />
      </div>
      <div className="flex flex-col gap-1">
        <div className={`h-6 w-40 ${block}`} />
        <div className={`h-44 ${block}`} />
      </div>
      <div className={`h-13 ${block}`} />
    </div>
  );
}
