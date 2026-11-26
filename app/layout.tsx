import { Pixels } from "@/components/marketing/Pixels";
import { VisitBeacon } from "@/components/marketing/VisitBeacon";
import { JsonLd } from "@/components/marketing/JsonLd";
import { DEFAULT_OG, organizationJsonLd, SITE } from "@/lib/site";
import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";
import "./layouts.css";
import "./marketing.css";

const title = "AI Time Machine: 55 AI agents for your business. Your AI team drafts. You decide.";
const description = "55 AI agents across 8 teams, your own dashboard and 4 bonuses. ₹1,999 once. Your AI team drafts. You decide. One-time ₹1,999.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(process.env.APP_URL || SITE.url),
  openGraph: {
    title,
    description,
    siteName: SITE.name,
    type: "website",
    url: "/",
    images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: "AI Time Machine" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_OG],
  },
  icons: { icon: "/media-kit/logo-lime.png", apple: "/media-kit/logo-lime.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Inter+Tight:wght@800;900&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <JsonLd data={organizationJsonLd()} />
        {children}
        <VisitBeacon />
        <Pixels />
      </body>
    </html>
  );
}
