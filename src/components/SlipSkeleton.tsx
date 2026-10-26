/** A placeholder the size of one slip with its footer row, pulsing gently while a list loads (motion 6). */
export function SlipSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col border border-mist">
      <div className="flex">
        <div className="h-27 w-28 shrink-0 skeleton lg:w-32" />
        <div className="flex flex-1 flex-col gap-2 px-4 py-4">
          <div className="h-8 w-28 skeleton" />
          <div className="h-5 w-3/4 skeleton" />
        </div>
      </div>
      <div className="h-12 skeleton border-t border-mist" />
    </div>
  );
}
