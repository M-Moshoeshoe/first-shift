import type { ReactNode, Ref } from "react";

interface PageTitleProps {
  title: ReactNode;
  /** One sentence under the title, in muted text. */
  intro?: ReactNode;
  /** Receives focus when the screen opens (useHeadingFocus), so a screen reader announces it. */
  headingRef?: Ref<HTMLHeadingElement>;
}

/** The screen's one h1 and the sentence under it, the same on every page (docs/DESIGN.md, Type). */
export function PageTitle({ title, intro, headingRef }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="text-4xl font-bold leading-tight tracking-title">
        {title}
      </h1>
      {intro ? <p className="text-lg text-muted">{intro}</p> : null}
    </div>
  );
}
