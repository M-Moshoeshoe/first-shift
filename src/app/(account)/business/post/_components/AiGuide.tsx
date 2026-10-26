/**
 * While the model works: our own gold clipboard and one honest line. Drafting
 * and the safety check run together on the server and answer once, so there
 * are no separate steps to tick off; showing ticks on a timer would be made up.
 */
export function AiGuide() {
  return (
    <div role="status" className="flex items-center gap-3 border border-line p-3">
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
        <rect x="5" y="4" width="18" height="22" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="1.5" />
        <rect x="10" y="2" width="8" height="5" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1.5" />
        <path d="M9 13h10M9 17h10M9 21h6" stroke="var(--color-ink)" strokeWidth="1.5" />
      </svg>
      <p className="text-sm">Checking it is safe work and drafting your options. This takes a few seconds.</p>
    </div>
  );
}
