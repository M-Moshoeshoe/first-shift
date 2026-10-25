import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { AppShell } from "@/components/AppShell";
import { PageTitle } from "@/components/ui/PageTitle";
import { SignInPanel } from "./_components/SignInPanel";

export const metadata: Metadata = { title: "Sign in to First Shift" };

export default function SignInPage() {
  return (
    <AppShell>
      <Band tone="paper">
        <PageTitle title="Sign in" intro="Use your Google account to find a paid tryout or post one." />
        <SignInPanel />
      </Band>
    </AppShell>
  );
}
