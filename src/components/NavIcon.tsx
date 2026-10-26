import { Award, Coins, Inbox, LayoutList, Search, SquarePlus, Store, User, type LucideIcon } from "lucide-react";

// Lucide (ISC licence), imported per icon (docs/DESIGN.md, Icons). Keyed by the tab's address in src/config/nav.ts.
const ICONS: Record<string, LucideIcon> = {
  "/work": Search,
  "/work/applications": Inbox,
  "/work/record": Award,
  "/work/profile": User,
  "/business": LayoutList,
  "/business/post": SquarePlus,
  "/business/credits": Coins,
  "/business/profile": Store,
};

/** A tab's icon, always beside its text label, so it's decorative to a screen reader. */
export function NavIcon({ href }: { href: string }) {
  const Icon = ICONS[href];
  return Icon ? <Icon aria-hidden="true" size={20} strokeWidth={1.75} /> : null;
}
