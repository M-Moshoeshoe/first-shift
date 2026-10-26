import type { NavItem } from "@/config/nav";

/** A nav link's text, with a small "2 new" tag after it when its badge has a count. */
export function NavLabel({ item, count }: { item: NavItem; count: number }) {
  return (
    <>
      {item.label}
      {item.badge && count > 0 ? <span className="ml-1 bg-ink px-1 text-micro text-paper tabular-nums">{count} new</span> : null}
    </>
  );
}
