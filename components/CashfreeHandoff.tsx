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
    <main className="page prose">
      <h1>Opening secure checkout…</h1>
      <p>The next page is Cashfree. Your name, email, and mobile are already on the payment. No card details are typed on this site.</p>
    </main>
  );
}
