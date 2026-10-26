import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_COLOR } from "@/config/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "First Shift",
  description: "Paid one-day tryouts at businesses near you, with a reference from the business that paid.",
  applicationName: "First Shift",
  manifest: "/manifest.webmanifest",
  // The tab and home-screen icons come from src/app/icon.png and apple-icon.png (the shift slip), never the host's.
  appleWebApp: { capable: true, title: "First Shift", statusBarStyle: "default" },
};

// Archivo, variable in weight and width, self-hosted by next/font: no JavaScript, no third-party request (docs/DESIGN.md, Type).
const archivo = Archivo({ subsets: ["latin"], display: "swap", axes: ["wdth"], variable: "--font-archivo" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" className={archivo.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
