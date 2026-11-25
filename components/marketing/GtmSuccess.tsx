"use client";

import Script from "next/script";

export const GTM_ID = "GTM-P3L723D9";

export type GtmPurchase = { transaction_id: string; value: number };

/** Google Tag Manager on the payment success page only. The purchase event is passed only after a Cashfree PAID confirmation. */
export function GtmSuccess({ purchase }: { purchase?: GtmPurchase }) {
  const init = [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag=window.gtag||gtag;",
    "gtag('js',new Date());",
  ];
  if (purchase) {
    const id = JSON.stringify(purchase.transaction_id);
    const value = JSON.stringify(purchase.value);
    init.push(
      `try{var k='aitm_gtm_purchase_'+${id};if(!localStorage.getItem(k)){localStorage.setItem(k,'1');dataLayer.push({event:'purchase',transaction_id:${id},value:${value},currency:'INR'});}}catch(e){dataLayer.push({event:'purchase',transaction_id:${id},value:${value},currency:'INR'});}`,
    );
  }
  return (
    <>
      <Script id="gtm-datalayer" strategy="afterInteractive">
        {init.join("")}
      </Script>
      <Script id="gtm-js" src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`} strategy="afterInteractive" />
    </>
  );
}
