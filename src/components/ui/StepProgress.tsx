interface StepProgressProps {
  /** The step the person is on, from 1. */
  current: number;
  /** Steps finished so far; the bar fills to done / total. */
  done: number;
  total: number;
}

/**
 * Motion 5: a thin bar that fills with transform: scaleX over --dur-slow as
 * each step completes. Transform only, so it never reflows the form.
 */
export function StepProgress({ current, done, total }: StepProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{done >= total ? "All steps done" : `Step ${current} of ${total}`}</p>
      <div
        role="progressbar"
        aria-label="Profile steps"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} steps done`}
        className="h-1 overflow-hidden bg-line"
      >
        <div className="h-full origin-left bg-go transition-transform duration-(--dur-slow) ease-out" style={{ transform: `scaleX(${done / total})` }} />
      </div>
    </div>
  );
}
