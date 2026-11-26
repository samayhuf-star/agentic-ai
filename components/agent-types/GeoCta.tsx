"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Server-renders both offers (so crawlers and no-JS visitors see both), then promotes the
 * India offer for visitors whose browser time zone or locale is India. No IP lookup, no cookies.
 */
export function GeoCta({ inrLabel, usdLabel, source }: { inrLabel: string; usdLabel: string; source: string }) {
  const [india, setIndia] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
      setIndia(/^Asia\/(Kolkata|Calcutta)$/.test(tz) || langs.some((l) => /-IN$/i.test(l || "")));
    } catch {
      setIndia(false);
    }
  }, []);
  const indiaHref = `/55-ai-agents?utm_source=seo&utm_medium=ai-agents&utm_content=${encodeURIComponent(source)}`;
  const usHref = `/us/55-ai-agents?utm_source=seo&utm_medium=ai-agents&utm_content=${encodeURIComponent(source)}`;
  const primary = india ? { href: indiaHref, label: `Get the 55 AI agents · ${inrLabel} one-time` } : { href: usHref, label: `Get the 55 AI agents · ${usdLabel} one-time` };
  const secondary = india ? { href: usHref, label: `Outside India? ${usdLabel}` } : { href: indiaHref, label: `In India? ${inrLabel}` };
  return (
    <div className="aa-cta-buttons">
      <Link className="btn btn-p" href={primary.href} prefetch={false}>
        {primary.label}
      </Link>
      <Link className="btn btn-g" href={secondary.href} prefetch={false}>
        {secondary.label}
      </Link>
    </div>
  );
}
