"use client";

import { useEffect, useRef } from "react";
import type { PublicConfig } from "@/lib/config";

declare global {
  interface Window {
    startLanding?: (config: PublicConfig) => () => void;
  }
}

export function Landing({ html, config }: { html: string; config: PublicConfig }) {
  const ref = useRef<HTMLDivElement>(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const parsed = JSON.parse(configKey) as PublicConfig;
    let stop = () => {};
    let cancelled = false;

    async function run() {
      if (!window.startLanding) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>("script[data-landing-boot]");
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            if (window.startLanding) resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "/landing-boot.js";
          script.dataset.landingBoot = "1";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Landing script failed to load."));
          document.body.appendChild(script);
        });
      }
      if (cancelled || !window.startLanding) return;
      stop = window.startLanding(parsed) || (() => {});
    }

    void run();
    return () => {
      cancelled = true;
      stop();
    };
  }, [configKey]);

  return <div ref={ref} className="landing-root" dangerouslySetInnerHTML={{ __html: html }} />;
}
