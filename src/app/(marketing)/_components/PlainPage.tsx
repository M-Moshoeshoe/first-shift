import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { PlainHeader } from "./PlainHeader";
import type { Scene } from "./ScenePhoto";
import { PlainSectionCard } from "./PlainSectionCard";

/** A list of key facts with its own icon, such as X for what we do not do yet. A plain list gets ticks. */
export interface PlainList {
  icon?: LucideIcon;
  points: readonly string[];
}

/** A paragraph, a list of key facts, or a list with its own icon. */
export type PlainBlock = string | readonly string[] | PlainList;

export interface PlainSection {
  heading: string;
  /** Shown beside the heading. */
  icon: LucideIcon;
  body: readonly PlainBlock[];
}

const anchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Safety, Privacy, Terms and Contact: a header band with the title and one
 * line, then each section as a card. From 1024 px a contents list sticks
 * beside the cards. Server-rendered, so the page adds no JavaScript.
 */
export function PlainPage({ title, intro, photo, sections, children }: { title: string; intro: string; photo?: Scene; sections: readonly PlainSection[]; children?: ReactNode }) {
  const contents = sections.length > 2;
  return (
    <PageShell>
      <PlainHeader title={title} intro={intro} photo={photo} />
      <div className="bg-paper px-5 py-8 lg:py-16">
        <div className={`mx-auto flex max-w-md flex-col gap-4 lg:max-w-6xl ${contents ? "lg:grid lg:grid-cols-[14rem_1fr] lg:items-start lg:gap-12" : ""}`}>
          {contents ? (
            <nav aria-label="On this page" className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-2">
              <h2 className="text-base font-bold">On this page</h2>
              <ul className="flex flex-col border-l border-line">
                {sections.map((section) => (
                  <li key={section.heading}>
                    <a href={`#${anchor(section.heading)}`} className="flex min-h-11 items-center py-1 pl-4 text-sm text-muted hover:text-ink">
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="flex max-w-2xl flex-col gap-4">
            {children}
            {sections.map((section) => (
              <PlainSectionCard key={section.heading} id={anchor(section.heading)} section={section} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
