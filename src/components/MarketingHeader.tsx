"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { homeFromCookies } from "@/domain/signedInHint";
import { BrandLogo } from "./BrandLogo";

// Sections of the home page are plain anchors, so the browser scrolls and fires hashchange (HowItWorksTabs opens the businesses tab).
const LINKS = [
  { href: "/#how-it-works", label: "How it works", anchor: true },
  { href: "/#for-businesses", label: "For businesses", anchor: true },
  { href: "/safety", label: "Safety", anchor: false },
  { href: "/#what-it-costs", label: "What it costs", anchor: true },
] as const;

const DEMO = { href: "/sign-in#demo", label: "Explore the demo" } as const;

/** Sign in, or Open First Shift when this browser holds the signed-in hint. Read after load, so the page stays static. */
const noSubscription = () => () => undefined;

function useAccountLink(): { href: string; label: string } {
  // The server render and hydration say Sign in; the browser then reads the cookie (it changes only on another page).
  const home = useSyncExternalStore(noSubscription, () => homeFromCookies(document.cookie), () => null);
  return home ? { href: home, label: "Open First Shift" } : { href: "/sign-in", label: "Sign in" };
}

function NavLink({ link, className, onClick }: { link: (typeof LINKS)[number]; className: string; onClick?: () => void }) {
  return link.anchor ? (
    <a href={link.href} onClick={onClick} className={className}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} onClick={onClick} className={className}>
      {link.label}
    </Link>
  );
}

/** Hidden while scrolling down, back on scrolling up or near the top (motion 9). A passive listener, no library. */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 80 && y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

/** The phone menu: open state, focus moved in on open and back on close, scroll locked, Escape and a Tab trap. */
function useDrawer() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    drawer.current?.querySelector<HTMLElement>("a, button")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    menuButton.current?.focus();
  };

  // Escape closes; Tab and Shift+Tab stay inside the drawer.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return close();
    if (event.key !== "Tab" || !drawer.current) return undefined;
    const focusable = [...drawer.current.querySelectorAll<HTMLElement>("a, button")];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
    return undefined;
  };

  return { open, setOpen, menuButton, drawer, close, onKeyDown };
}

/**
 * Public pages: the logo, then the links, Explore the demo and Sign in (or Open First Shift) on a desktop, or a
 * menu button on a phone that opens a drawer from the right with a scrim.
 * The drawer traps focus while open and closes on Escape, a scrim tap or a
 * link, returning focus to the menu button. No auth code is loaded here.
 */
export function MarketingHeader() {
  const hidden = useHideOnScroll();
  const { open, setOpen, menuButton, drawer, close, onKeyDown } = useDrawer();
  const account = useAccountLink();

  return (
    <header className={`sticky top-0 z-30 border-b border-line bg-paper px-5 transition-transform duration-(--dur-base) ease-out ${hidden && !open ? "-translate-y-full" : ""}`}>
      <div className="mx-auto flex max-w-md items-center justify-between gap-4 py-2 lg:max-w-6xl">
        <Link href="/" aria-label="First Shift, home" className="inline-flex min-h-11 items-center">
          <BrandLogo height={28} priority />
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-6 lg:flex">
          {LINKS.map((link) => (
            <NavLink key={link.href} link={link} className="link text-[13.5px] font-semibold" />
          ))}
          <Link href={DEMO.href} className="link text-[13.5px] font-semibold">
            {DEMO.label}
          </Link>
          <Link href={account.href} className="inline-flex min-h-10 items-center bg-primary px-4 text-sm font-semibold text-on-primary">
            {account.label}
          </Link>
        </nav>
        <button ref={menuButton} type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm font-semibold lg:hidden">
          <Menu aria-hidden="true" size={20} strokeWidth={1.75} />
          Menu
        </button>
      </div>
      {/* The drawer: off-canvas and inert while closed, so it's never focusable or read out. */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={close} className={`absolute inset-0 bg-ink/40 transition-opacity duration-(--dur-slow) ${open ? "opacity-100" : "opacity-0"}`} />
        <div
          ref={drawer}
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!open}
          onKeyDown={onKeyDown}
          className={`absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-2 border-l border-line bg-paper px-5 py-3 transition-transform duration-(--dur-slow) ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <button type="button" onClick={close} className="inline-flex min-h-11 items-center gap-2 self-end text-sm font-semibold">
            <X aria-hidden="true" size={20} strokeWidth={1.75} />
            Close
          </button>
          {LINKS.map((link) => (
            <NavLink key={link.href} link={link} onClick={() => setOpen(false)} className="flex min-h-11 items-center border-b border-line text-base font-semibold" />
          ))}
          <Link href={account.href} onClick={() => setOpen(false)} className="mt-4 inline-flex min-h-12 items-center justify-center bg-primary px-5 text-base font-semibold text-on-primary">
            {account.label}
          </Link>
          <Link href={DEMO.href} onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center justify-center text-base font-semibold">
            <span className="link">{DEMO.label}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
