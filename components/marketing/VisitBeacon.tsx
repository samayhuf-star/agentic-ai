"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PRIVATE = /^\/(sup-admin|admin|partner\/|dashboard|onboarding|welcome|unsubscribe)/;

/** Sends one landing ping so Sources can count visitors. Skips signed-in product and admin pages. */
export function VisitBeacon() {
  const pathname = usePathname() || "/";
  useEffect(() => {
    if (PRIVATE.test(pathname)) return;
    const path = `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`.slice(0, 200);
    void fetch("/api/marketing/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: path.split("?")[0] || "/" }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
