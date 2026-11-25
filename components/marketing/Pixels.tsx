"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { GOOGLE_ADS_ID, META_PIXEL_ID } from "@/lib/marketing/pixel-client";

const PRIVATE = /^\/(sup-admin|admin|partner\/|dashboard|onboarding|welcome|unsubscribe)/;

/** Meta Pixel + Google Ads tag. Off unless NEXT_PUBLIC_META_PIXEL_ID / NEXT_PUBLIC_GOOGLE_ADS_ID are set. Never on private pages. */
export function Pixels() {
  const pathname = usePathname() || "/";
  const first = useRef(true);
  const off = PRIVATE.test(pathname);
  useEffect(() => {
    if (off) return;
    if (first.current) {
      first.current = false;
      return; // the base code sends the first PageView
    }
    window.fbq?.("track", "PageView");
  }, [pathname, off]);
  if (off || (!META_PIXEL_ID && !GOOGLE_ADS_ID)) return null;
  return (
    <>
      {META_PIXEL_ID ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(META_PIXEL_ID)});fbq('track','PageView');`}
        </Script>
      ) : null}
      {GOOGLE_ADS_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ADS_ID)}`} strategy="afterInteractive" />
          <Script id="google-ads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(GOOGLE_ADS_ID)});`}
          </Script>
        </>
      ) : null}
    </>
  );
}

export function PurchaseEvent({ orderId, value }: { orderId: string; value: number }) {
  useEffect(() => {
    let tries = 0;
    const fire = async () => {
      const { trackPurchase } = await import("@/lib/marketing/pixel-client");
      if (window.fbq || window.gtag || tries > 10) trackPurchase(orderId, value);
      else {
        tries += 1;
        setTimeout(fire, 500);
      }
    };
    if (META_PIXEL_ID || GOOGLE_ADS_ID) void fire();
  }, [orderId, value]);
  return null;
}
