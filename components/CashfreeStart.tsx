"use client";

import { useEffect, useState } from "react";
import { CashfreeHandoff } from "@/components/CashfreeHandoff";
import { InAppOpenActions } from "@/components/InAppBrowserNotice";
import { inAppKind, osOf, preferredBrowser, shouldHoldCashfreeHandoff, type InAppKind } from "@/lib/device";

export function CashfreeStart({ sessionId, mode }: { sessionId: string; mode: string }) {
  const [kind, setKind] = useState<InAppKind | "pending">("pending");
  const [os, setOs] = useState<"android" | "ios" | "other">("other");
  const [continueHere, setContinueHere] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setKind(inAppKind(ua));
    setOs(osOf(ua));
  }, []);

  if (kind === "pending") {
    return (
      <main className="pay-wait">
        <div className="pay-spin" aria-hidden="true" />
        <h1>Opening secure payment…</h1>
      </main>
    );
  }

  if (shouldHoldCashfreeHandoff(kind) && !continueHere) {
    const browser = preferredBrowser(os);
    return (
      <main className="wrap onboard checkout inapp-hold">
        <h1>Open in {browser} to pay with UPI</h1>
        <p className="lead">This app can block Google Pay, PhonePe and Paytm. Open this page in {browser}, then pay.</p>
        <InAppOpenActions os={os} />
        <button type="button" className="btn btn-g" onClick={() => setContinueHere(true)}>
          Continue here anyway
        </button>
      </main>
    );
  }

  return <CashfreeHandoff sessionId={sessionId} mode={mode} />;
}
