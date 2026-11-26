import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Integrations",
  "AI Time Machine works with an AI key you already have (Claude, ChatGPT or Grok), Razorpay payments, and email sign-in. We only list connections that exist today.",
  "/integrations",
);

const items = [
  { title: "Anthropic Claude", body: "Connect your own Anthropic API key so agents can draft with Claude. Usage is billed by Anthropic." },
  { title: "OpenAI ChatGPT", body: "Connect your own OpenAI API key. Usage is billed by OpenAI under their terms." },
  { title: "xAI Grok", body: "Connect your own xAI API key. Usage is billed by xAI under their terms." },
  { title: "Razorpay payments", body: "Checkout is taken in Indian rupees through Razorpay. Cards, debit cards, UPI and net banking. We do not store your card number or UPI pin." },
  { title: "Email sign-in", body: "Access is by a one-time code sent to the email you paid with. There is no password to store." },
];

export default function IntegrationsPage() {
  return (
    <PageShell crumbs={[{ name: "Integrations", path: "/integrations" }]}>
      <p className="mk-kicker">Product</p>
      <h1>Integrations we actually have</h1>
      <p className="mk-lead">
        This page lists only connections that exist in the product today. We do not show a wall of logos for tools we have not built.
      </p>
      <div className="mk-grid" style={{ marginTop: 36 }}>
        {items.map((item) => (
          <article className="mk-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
      <div className="mk-prose" style={{ marginTop: 40 }}>
        <h2>What is not here yet</h2>
        <p>
          There is no one-click connection to Instagram, WhatsApp Business, Shopify, Tally, Slack, or an ad account. If you want an agent to work with facts from those tools, you bring the facts into the product yourself — for example by pasting a price list or an order update.
        </p>
        <p>
          When a new connection ships, it will appear on this page. See also <Link href="/security">how we handle keys and data</Link> and <Link href="/help/connect-ai-key">how to connect an AI key</Link>.
        </p>
      </div>
    </PageShell>
  );
}
