"use client";

import { useEffect, useState } from "react";
import { inAppKind, osOf, type InAppKind } from "@/lib/device";

const APP_NAME: Record<Exclude<InAppKind, null>, string> = {
  google: "the Google app",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  twitter: "X",
  webview: "this app",
};

/** In-app browsers (Google app, Instagram, Facebook, LinkedIn) often cannot open UPI apps. Offer Chrome/Safari. */
export function InAppBrowserNotice({ compact = false }: { compact?: boolean }) {
  const [kind, setKind] = useState<InAppKind>(null);
  const [os, setOs] = useState<"android" | "ios" | "other">("other");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setKind(inAppKind(ua));
    setOs(osOf(ua));
  }, []);

  if (!kind) return null;
  const here = typeof window !== "undefined" ? window.location.href : "";
  const intent = (() => {
    try {
      const u = new URL(here);
      return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(here)};end`;
    } catch {
      return here;
    }
  })();

  async function copy() {
    try {
      await navigator.clipboard.writeText(here);
      setCopied(true);
    } catch {
      window.prompt("Copy this link and open it in Safari or Chrome:", here);
    }
  }

  return (
    <div className={`inapp-note${compact ? " inapp-note-compact" : ""}`} role="note">
      <strong>{os === "ios" ? "Open in Safari to pay with UPI" : "Open in Chrome to pay with UPI"}</strong>
      <p>
        You are inside {APP_NAME[kind]}. It can block Google Pay, PhonePe and Paytm from opening. Open this page in your browser, or pay with UPI ID, QR or card instead.
      </p>
      <div className="inapp-actions">
        {os === "android" ? (
          <a className="btn btn-p" href={intent}>
            Open in Chrome
          </a>
        ) : null}
        <button type="button" className="btn btn-g" onClick={copy}>
          {copied ? "Link copied. Paste it in Safari or Chrome" : "Copy link"}
        </button>
      </div>
      {os === "ios" ? <p className="inapp-hint">Or tap ••• at the top and choose “Open in browser”.</p> : null}
    </div>
  );
}
