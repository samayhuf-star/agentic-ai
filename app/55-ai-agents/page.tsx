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
  const html = fs.readFileSync(path.join(process.cwd(), "components/landing/body.html"), "utf8");
  return <Landing html={html} config={publicConfig()} />;
}
