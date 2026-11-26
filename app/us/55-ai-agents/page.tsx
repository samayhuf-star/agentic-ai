import fs from "node:fs";
import path from "node:path";
import { UsLanding } from "@/components/landing/UsLanding";
import { pageMeta } from "@/lib/site";
import { usFooterAddress, usPriceLabel, US_CHECKOUT_PATH } from "@/lib/us";

export const dynamic = "force-dynamic";

export const metadata = pageMeta(
  "55 AI agents for your business — $49.99 lifetime",
  "55 AI agents across 8 teams, your own dashboard and 4 bonuses. $49.99 once. Your AI team drafts. You decide. One-time $49.99.",
  "/us/55-ai-agents",
);

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export default function UsAgentsOfferPage() {
  const price = usPriceLabel();
  const address = usFooterAddress();
  let html = fs.readFileSync(path.join(process.cwd(), "components/landing/body-us.html"), "utf8");
  html = html.split("__US_PRICE__").join(escapeHtml(price));
  html = html.replace("<!--US_FOOTER_ADDRESS-->", address ? `<br>${escapeHtml(address)}` : "");
  return <UsLanding html={html} config={{ checkoutPath: US_CHECKOUT_PATH, priceUsdLabel: price }} />;
}
