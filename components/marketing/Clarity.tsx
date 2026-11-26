"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { CLARITY_PROJECT_ID, isClarityPath, readClaritySessionId } from "@/lib/marketing/clarity";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

function captureSessionId(cb: (id: string) => void) {
  const done = (value: unknown) => {
    const id = readClaritySessionId(value);
    if (id) cb(id);
  };
  try {
    window.clarity?.("get", "sessionId", done);
  } catch {
    /* ignore */
  }
  // Fallback: Clarity stores the session in _clsk as sessionId|timestamp|...
  try {
    const raw = document.cookie.split("; ").find((row) => row.startsWith("_clsk="));
    if (raw) done(decodeURIComponent(raw.slice(6)).split("|")[0]);
  } catch {
    /* ignore */
  }
}

function report(sessionId: string, orderId?: string | null, path?: string) {
  void fetch("/api/marketing/clarity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, orderId: orderId || undefined, path: path || undefined }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {});
}

function mark(type: string, detail: Record<string, string>) {
  void fetch("/api/marketing/step", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, ...detail }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {});
}

/** Loads Clarity only on sales landing, checkout and payment-return pages. Masks all input and text. Never on the gateway. */
export function Clarity() {
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const on = Boolean(CLARITY_PROJECT_ID) && isClarityPath(pathname);
  const orderId = search.get("order_id") || search.get("order") || search.get("rzp");

  useEffect(() => {
    if (!on) return;
    const start = Date.now();
    const tick = () => {
      captureSessionId((id) => report(id, orderId, pathname));
      if (Date.now() - start < 8000) window.setTimeout(tick, 1500);
    };
    tick();
  }, [on, orderId, pathname]);

  useEffect(() => {
    if (!on) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (href.startsWith("/checkout") || href.includes("/checkout") || href.startsWith("/pricing")) {
        mark("cta_click", { path: pathname, href: href.slice(0, 200) });
      }
    };
    const onFocus = (event: FocusEvent) => {
      const el = event.target as HTMLElement | null;
      if (!el || pathname !== "/checkout" && !pathname.startsWith("/checkout")) return;
      if (el.tagName !== "INPUT") return;
      mark("form_start", { path: pathname });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocus);
    };
  }, [on, pathname]);

  if (!on) return null;
  const id = JSON.stringify(CLARITY_PROJECT_ID);
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?referrer="+encodeURIComponent(document.referrer||"");y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);c[a]("set","maskingMode","strict");c[a]("consent");})(window,document,"clarity","script",${id});`}
    </Script>
  );
}
