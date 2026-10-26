import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

const GROUPS = [
  { title: "Product", links: [{ href: "/#how-it-works", label: "How it works" }, { href: "/#for-businesses", label: "For businesses" }, { href: "/#what-it-costs", label: "What it costs" }] },
  { title: "Trust", links: [{ href: "/safety", label: "Safety and fair play" }, { href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }] },
  { title: "Contact", links: [{ href: "/contact", label: "Contact us" }] },
] as const;

/** Every public page's footer: the logo, one line about First Shift, and the link groups. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-paper px-5 py-12">
      <div className="mx-auto flex max-w-md flex-col gap-8 lg:max-w-6xl lg:flex-row lg:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <BrandLogo height={24} />
          <p className="text-sm text-muted">Paid one-day tryouts at small businesses near you, with a reference from the business that paid.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="flex flex-col gap-1">
              <h2 className="text-micro font-semibold text-muted">{group.title}</h2>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center self-start text-sm">
                  <span className="link">{link.label}</span>
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
