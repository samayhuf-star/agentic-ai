import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Boardroom: 55 AI agents for your business. You just say yes.",
  description: "55 AI agents across 8 teams, your own dashboard and 5 bonuses. ₹1,999 once. Live in 15 minutes, for any business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Inter+Tight:wght@800;900&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
