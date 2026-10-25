import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

/**
 * The two ways in. The first is the screen's one primary action. Each carries
 * the visitor's intent through sign-in, so the role screen can point to it.
 */
export function StartActions() {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/work?intent=work" className={buttonClass("primary")}>
        Find a paid tryout
      </Link>
      <Link href="/business?intent=business" className={buttonClass("secondary")}>
        Post a tryout
      </Link>
    </div>
  );
}
