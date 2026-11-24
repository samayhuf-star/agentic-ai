"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TAWK_SRC = "https://embed.tawk.to/6b06130bd56de23cb5a29e4a/1k87rkqnj";

type TawkApi = {
  hideWidget?: () => void;
  showWidget?: () => void;
  onLoad?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
  }
}

function isAgentChat(pathname: string) {
  return pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");
}

export function TawkChat() {
  const pathname = usePathname();
  const hide = isAgentChat(pathname);

  useEffect(() => {
    const apply = () => {
      if (hide) window.Tawk_API?.hideWidget?.();
      else window.Tawk_API?.showWidget?.();
    };

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_API.onLoad = apply;
    apply();
  }, [hide]);

  // Do not inject the script on a first load of the in-app agent chat, so the
  // widget never covers that UI. After it has loaded on a public page, the
  // effect above hides or shows it during client navigations.
  if (hide) return null;

  return <Script id="tawk-to" src={TAWK_SRC} strategy="lazyOnload" />;
}
