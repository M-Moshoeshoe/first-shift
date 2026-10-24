import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

/** The two ways in. The first is the screen's one primary action. */
export function StartActions() {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/work" className={buttonClass("primary")}>
        Find a paid tryout
      </Link>
      <Link href="/business" className={buttonClass("secondary")}>
        Post a tryout
      </Link>
    </div>
  );
}
