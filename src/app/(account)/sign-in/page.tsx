import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageShell } from "@/components/ui/PageShell";
import { SignInPanel } from "./_components/SignInPanel";

export const metadata: Metadata = { title: "Sign in to First Shift" };

export default function SignInPage() {
  return (
    <PageShell>
      <Band tone="paper">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight tracking-title">Sign in</h1>
          <p className="text-lg text-muted">Use your Google account to find a paid tryout or post one.</p>
        </div>
        <SignInPanel />
      </Band>
    </PageShell>
  );
}
