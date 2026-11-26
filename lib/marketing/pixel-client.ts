"use client";

type Fbq = (...args: unknown[]) => void;
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
/** Production Google Ads account 909-928-3797. Fallback keeps remarketing on if the env var is unset. */
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-18595562469";
export const GOOGLE_ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "_Ku4CN3W478dEOWHh6NF";

export function trackLead(eventId: string) {
  window.fbq?.("track", "Lead", {}, { eventID: eventId });
}

/** Call once per order. Meta dedupes against the server event by eventID; Google by transaction_id. */
export function trackPurchase(orderId: string, value: number) {
  const key = `aitm_purchase_${orderId}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    // storage blocked: still fire; Meta and Google dedupe
  }
  window.fbq?.("track", "Purchase", { value, currency: "INR" }, { eventID: `purchase_${orderId}` });
  if (GOOGLE_ADS_ID && GOOGLE_ADS_PURCHASE_LABEL) {
    window.gtag?.("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`, value, currency: "INR", transaction_id: orderId });
  }
}
