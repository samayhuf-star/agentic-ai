"use client";

import { useEffect, useState } from "react";
import { CashfreeHandoff } from "@/components/CashfreeHandoff";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";
import { inAppKind, shouldHoldCashfreeHandoff, type InAppKind } from "@/lib/device";

export function CashfreeStart({ sessionId, mode }: { sessionId: string; mode: string }) {
  const [kind, setKind] = useState<InAppKind | "pending">("pending");
  const [continueHere, setContinueHere] = useState(false);

  useEffect(() => {
    setKind(inAppKind(navigator.userAgent));
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
    return (
      <main className="wrap onboard checkout">
        <InAppBrowserNotice />
        <h1>Open in Chrome to pay with UPI</h1>
        <p className="lead">This in-app browser can block Google Pay, PhonePe and Paytm. Open the page in Chrome, then pay.</p>
        <button type="button" className="btn btn-g" onClick={() => setContinueHere(true)}>
          Continue here anyway
        </button>
      </main>
    );
  }

  return <CashfreeHandoff sessionId={sessionId} mode={mode} />;
}
