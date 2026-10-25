import type { NavItem } from "@/config/nav";

/** A nav link's text, with "(2 new)" after it when its badge has a count. Plain text, so it needs no new design. */
export function NavLabel({ item, count }: { item: NavItem; count: number }) {
  return (
    <>
      {item.label}
      {item.badge && count > 0 ? <span className="tabular-nums"> ({count} new)</span> : null}
    </>
  );
}
