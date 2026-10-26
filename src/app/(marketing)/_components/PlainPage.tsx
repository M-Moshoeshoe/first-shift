import type { ReactNode } from "react";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/PageTitle";

/** A paragraph, or a list of short points. */
export type PlainBlock = string | readonly string[];

export interface PlainSection {
  heading: string;
  body: readonly PlainBlock[];
}

/**
 * Safety, Privacy, Terms and Contact: plain readable text, no JavaScript of
 * their own. Styled properly in the UI sprint; for now, the shared bands.
 */
export function PlainPage({ title, intro, sections, children }: { title: string; intro: string; sections: readonly PlainSection[]; children?: ReactNode }) {
  return (
    <PageShell>
      <Band tone="paper">
        <PageTitle title={title} intro={intro} />
        {children}
        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">{section.heading}</h2>
            {section.body.map((block) =>
              typeof block === "string" ? (
                <p key={block} className="text-lg">
                  {block}
                </p>
              ) : (
                <ul key={block.join("|")} className="flex list-disc flex-col gap-1 pl-5 text-lg">
                  {block.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </Band>
    </PageShell>
  );
}
