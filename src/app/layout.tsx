import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { THEME_COLOR } from "@/config/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "First Shift",
  description: "Paid one-day tryouts at businesses near you, with a reference from the business that paid.",
  applicationName: "First Shift",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
