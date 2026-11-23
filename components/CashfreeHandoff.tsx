"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Cashfree?: new (options: { mode: string }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: string }) => void;
    };
  }
}

export function CashfreeHandoff({ sessionId, mode }: { sessionId: string; mode: string }) {
  useEffect(() => {
    if (!sessionId) return;
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => {
      if (!window.Cashfree) return;
      const cashfree = new window.Cashfree({ mode });
      cashfree.checkout({ paymentSessionId: sessionId, redirectTarget: "_self" });
    };
    document.body.appendChild(script);
  }, [sessionId, mode]);

  return (
    <main className="pay-wait">
      <div className="pay-spin" aria-hidden="true" />
      <h1>Opening secure payment…</h1>
    </main>
  );
}
