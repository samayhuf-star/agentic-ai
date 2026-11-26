import fs from "node:fs";
import path from "node:path";
import { Landing } from "@/components/landing/Landing";
import { publicConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Time Machine: 55 AI agents for your business. Your AI team drafts. You decide.",
  description: "55 AI agents across 8 teams, your own dashboard and 4 bonuses. ₹1,999 once. Your AI team drafts. You decide. One-time ₹1,999.",
};

export default function AgentsOfferPage() {
  const config = publicConfig();
  const html = withCountdown(fs.readFileSync(path.join(process.cwd(), "components/landing/body.html"), "utf8"), config.offerEnds);
  return <Landing html={html} config={config} />;
}

/** Render the launch countdown with real numbers on the server, so it never shows 00s before the script runs. */
function withCountdown(html: string, offerEnds: string) {
  const end = Date.parse(offerEnds);
  const ms = end - Date.now();
  if (!Number.isFinite(end) || ms <= 0) return html;
  const s = Math.floor(ms / 1000);
  const v: Record<string, number> = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  const pad = (n: number) => String(n).padStart(2, "0");
  return html
    .replace(/data-countdown hidden>/g, "data-countdown>")
    .replace(/<span data-cd="([dhms])">00<\/span>/g, (_m, k: string) => `<span data-cd="${k}">${pad(v[k])}</span>`);
}
