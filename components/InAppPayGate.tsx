"use client";

import { useEffect, useState, type ReactNode } from "react";
import { InAppOpenActions } from "@/components/InAppBrowserNotice";
import { inAppKind, osOf, preferredBrowser, shouldHoldCashfreeHandoff, type InAppKind } from "@/lib/device";

const APP_NAME: Record<Exclude<InAppKind, null>, string> = {
  google: "the Google app",
  instagram: "Instagram",
  facebook: "Facebook or Messenger",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  twitter: "X",
  line: "LINE",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  webview: "this app",
};

/** Full-screen block on checkout and the pay step. Normal Chrome/Safari are unaffected. */
export function InAppPayGate({ children, pendingLabel = "Checking your browser…" }: { children: ReactNode; pendingLabel?: string }) {
  const [kind, setKind] = useState<InAppKind | "pending">("pending");
  const [os, setOs] = useState<"android" | "ios" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    setKind(inAppKind(ua));
    setOs(osOf(ua));
  }, []);

  if (kind === "pending") {
    return (
      <main className="inapp-gate" aria-busy="true">
        <p className="lead">{pendingLabel}</p>
      </main>
    );
  }

  if (!shouldHoldCashfreeHandoff(kind)) return <>{children}</>;

  const browser = preferredBrowser(os);
  return (
    <main className="inapp-gate" role="dialog" aria-modal="true" aria-labelledby="inapp-gate-title">
      <h1 id="inapp-gate-title">Open in {browser} to pay securely</h1>
      <p className="lead">
        You are inside {APP_NAME[kind]}. Google Pay, PhonePe and Paytm usually cannot open here, so payment cannot start in this browser.
        Open this page in {browser}, then pay.
      </p>
      <InAppOpenActions os={os} />
    </main>
  );
}
