"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { GA4_ID, GOOGLE_ADS_ID, GOOGLE_ADS_US_ID, META_PIXEL_ID } from "@/lib/marketing/pixel-client";

const PRIVATE = /^\/(sup-admin|admin|partner\/|dashboard|onboarding|welcome|unsubscribe)/;

/** Meta Pixel (if configured) + Google Ads and GA4 tags on public pages. Never on private pages. */
export function Pixels() {
  const pathname = usePathname() || "/";
  const first = useRef(true);
  const off = PRIVATE.test(pathname);
  const usPage = pathname === "/us" || pathname.startsWith("/us/");
  const adsId = usPage ? GOOGLE_ADS_US_ID : GOOGLE_ADS_ID;
  useEffect(() => {
    if (off) return;
    if (first.current) {
      first.current = false;
      return; // the base code sends the first PageView
    }
    window.fbq?.("track", "PageView");
    // Send the new URL so remarketing lists can match /checkout and /payment on client navigations.
    window.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.href });
  }, [pathname, off]);
  if (off || (!META_PIXEL_ID && !adsId && !GA4_ID)) return null;
  return (
    <>
      {META_PIXEL_ID && !usPage ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(META_PIXEL_ID)});fbq('track','PageView');`}
        </Script>
      ) : null}
      {adsId || GA4_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId || GA4_ID)}`} strategy="afterInteractive" />
          <Script id="google-ads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${adsId ? `gtag('config',${JSON.stringify(adsId)});` : ""}${GA4_ID ? `gtag('config',${JSON.stringify(GA4_ID)});` : ""}`}
          </Script>
        </>
      ) : null}
    </>
  );
}

export function PurchaseEvent({
  orderId,
  value,
  currency = "INR",
  market = "in",
}: {
  orderId: string;
  value: number;
  currency?: "INR" | "USD";
  market?: "in" | "us";
}) {
  useEffect(() => {
    let tries = 0;
    const fire = async () => {
      const { trackPurchase } = await import("@/lib/marketing/pixel-client");
      if (window.fbq || window.gtag || tries > 10) trackPurchase(orderId, value, { currency, market });
      else {
        tries += 1;
        setTimeout(fire, 500);
      }
    };
    const hasTag = market === "us" ? Boolean(GOOGLE_ADS_US_ID || GA4_ID) : Boolean(META_PIXEL_ID || GOOGLE_ADS_ID || GA4_ID);
    if (hasTag) void fire();
  }, [orderId, value, currency, market]);
  return null;
}
