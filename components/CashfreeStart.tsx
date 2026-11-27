"use client";

import { useEffect } from "react";
import { CashfreeHandoff } from "@/components/CashfreeHandoff";
import { InAppPayGate } from "@/components/InAppPayGate";

export function CashfreeStart({ sessionId, mode, razorpayUrl }: { sessionId: string; mode: string; razorpayUrl?: string }) {
  return (
    <InAppPayGate pendingLabel="Opening secure payment…">
      {razorpayUrl ? <RazorpayHandoff url={razorpayUrl} /> : <CashfreeHandoff sessionId={sessionId} mode={mode} />}
    </InAppPayGate>
  );
}

function RazorpayHandoff({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return (
    <main className="pay-wait">
      <div className="pay-spin" aria-hidden="true" />
      <h1>Opening secure payment…</h1>
      <p>
        <a href={url}>Tap here if it does not open</a>
      </p>
    </main>
  );
}
