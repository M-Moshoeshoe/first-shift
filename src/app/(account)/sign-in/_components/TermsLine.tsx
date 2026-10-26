import Link from "next/link";

/** Under the sign-in button: what continuing agrees to. The agreement is recorded at sign-in (lib/auth/fetchDestination.ts). */
export function TermsLine() {
  return (
    <p className="text-sm text-muted">
      By continuing, you agree to the{" "}
      <Link href="/terms" className="link">
        Terms
      </Link>{" "}
      and the{" "}
      <Link href="/privacy" className="link">
        Privacy notice
      </Link>
      .
    </p>
  );
}
