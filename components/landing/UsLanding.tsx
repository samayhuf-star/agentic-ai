"use client";

import { useEffect, useRef } from "react";

export type UsLandingConfig = {
  checkoutPath: string;
  priceUsdLabel: string;
};

declare global {
  interface Window {
    startUsLanding?: (config: UsLandingConfig) => () => void;
  }
}

/** Same interactive landing as /55-ai-agents, with a US-only boot script so INR geo pricing never runs. */
export function UsLanding({ html, config }: { html: string; config: UsLandingConfig }) {
  const ref = useRef<HTMLDivElement>(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const parsed = JSON.parse(configKey) as UsLandingConfig;
    let stop = () => {};
    let cancelled = false;

    async function run() {
      if (!window.startUsLanding) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>("script[data-us-landing-boot]");
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            if (window.startUsLanding) resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "/landing-boot-us.js";
          script.dataset.usLandingBoot = "1";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("US landing script failed to load."));
          document.body.appendChild(script);
        });
      }
      if (cancelled || !window.startUsLanding) return;
      stop = window.startUsLanding(parsed) || (() => {});
    }

    void run();
    return () => {
      cancelled = true;
      stop();
    };
  }, [configKey]);

  return <div ref={ref} className="landing-root" dangerouslySetInnerHTML={{ __html: html }} />;
}
