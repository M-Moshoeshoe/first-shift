import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { AppShell } from "@/components/AppShell";
import { PageTitle } from "@/components/ui/PageTitle";
import { SignInPanel } from "./_components/SignInPanel";

export const metadata: Metadata = { title: "Sign in to First Shift" };

export default function SignInPage() {
  return (
    <AppShell bare>
      {/* A card, paper on the mist backdrop, at every width. */}
      <div className="mx-auto flex max-w-md flex-col gap-6 border border-line bg-paper p-6">
        <BrandLogo height={28} />
        <PageTitle title="Sign in or create your account" intro="Use your Google account to find a paid tryout or post one." />
        <SignInPanel />
      </div>
    </AppShell>
  );
}
