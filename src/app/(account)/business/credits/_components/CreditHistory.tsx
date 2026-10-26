import { Check, Gift, Lock, Send, Undo2, type LucideIcon } from "lucide-react";
import { CREDITS_COPY } from "@/domain/creditsCopy";
import { sastDay } from "@/domain/time";
import type { CreditsViewResponse } from "@/schemas/credits";

type Line = CreditsViewResponse["history"][number];

const ICONS: Record<Line["kind"], LucideIcon> = { granted: Gift, held: Lock, used: Check, returned: Undo2, requested: Send };

const signed = (change: number): string => (change > 0 ? `+${change}` : String(change));

/**
 * The credit history, newest first, grouped by day: each entry with an icon
 * for its kind, what it did to the credits available (+3, -1), and the
 * balance just after it. A use shows no change: its credit was set aside
 * when the tryout was booked.
 */
export function CreditHistory({ history }: { history: readonly Line[] }) {
  const days = new Map<string, Line[]>();
  for (const line of history) {
    const day = sastDay(new Date(line.at));
    days.set(day, [...(days.get(day) ?? []), line]);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...days].map(([day, lines]) => (
        <section key={day} aria-label={day} className="flex flex-col">
          <h3 className="border-b border-ink pb-1 text-sm font-semibold">{day}</h3>
          <ul className="flex flex-col divide-y divide-line">
            {lines.map((line, index) => {
              const Icon = ICONS[line.kind];
              return (
                <li key={`${line.at}-${index}`} className="flex items-center gap-3 py-2">
                  <Icon aria-hidden="true" size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
                  <span className="flex-1 text-base">{line.text}</span>
                  <span className="flex shrink-0 flex-col items-end tabular-nums">
                    {line.change !== 0 ? <span className={`text-base font-semibold ${line.change > 0 ? "text-go" : ""}`}>{signed(line.change)}</span> : null}
                    <span className="text-micro text-muted">{CREDITS_COPY.balanceAfter(line.balance)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
