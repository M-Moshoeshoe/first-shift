import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatRand } from "@/domain/money";
import { sastSlot } from "@/domain/time";
import type { OwnTryout } from "@/lib/useOwnTryouts";
import { canWithdraw, statusLine } from "./ownTryouts";

/** One of the owner's tryouts as a compact row: what and when, the pay, a status chip, and Withdraw while nobody is booked. */
export function TryoutRow({ tryout, onWithdraw }: { tryout: OwnTryout; onWithdraw: () => void }) {
  const { day, hours } = sastSlot(tryout.startAt, tryout.endAt);
  return (
    <div className="flex flex-col border border-line bg-paper px-3 py-1">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/business/tryouts/${tryout.id}`} className="inline-flex min-h-11 items-center text-base font-semibold">
          <span className="link">{tryout.title}</span>
        </Link>
        <span className="text-xl font-bold tabular-nums">{formatRand(tryout.payCents)}</span>
      </div>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
        <span className="text-sm text-muted">
          {day}, {hours}
        </span>
        <span className="flex items-center gap-3">
          <span className={`border px-1.5 py-0.5 text-micro font-semibold tabular-nums ${tryout.status === "published" ? "border-ink" : "border-line text-muted"}`}>{statusLine(tryout)}</span>
          {canWithdraw(tryout.status) ? (
            <Button variant="quiet" aria-label={`Withdraw ${tryout.title} on ${day}`} onClick={onWithdraw}>
              Withdraw
            </Button>
          ) : null}
        </span>
      </div>
    </div>
  );
}
