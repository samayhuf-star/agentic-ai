import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Pricing",
  "AI Time Machine is ₹1,999 once. No monthly fee for that purchase. AI usage is billed by the provider whose key you connect.",
  "/pricing",
);

const faqs = [
  { q: "Is this really a one-time price?", a: "Yes. The purchase is ₹1,999 once. There is no monthly fee and no per-seat charge for this purchase." },
  { q: "Why might I see $24 on the offer page?", a: "Visitors outside India may see $24. The payment is still taken in Indian rupees, and the amount charged is ₹1,999." },
  { q: "What is included?", a: "The 55 agents, your dashboard, and the bonuses described on the 55 agents page. The launch countdown and buy button also live there." },
  { q: "Does ₹1,999 include ChatGPT or Claude usage?", a: "No. You connect your own AI key (Claude, ChatGPT or Grok). That provider bills you separately. AI Time Machine provides the skills and the place to manage drafts." },
  { q: "Do agents run by themselves?", a: "Not yet. Your AI team prepares drafts and ideas. Nothing goes out without your yes. Agents do not run on their own in the background yet." },
  { q: "How do I get access after I pay?", a: "Access is digital. After a successful payment we email a sign-in code to the address you paid with. See Shipping and Delivery." },
  { q: "Who will the charge show as?", a: "The payment goes through Razorpay, and the charge may show as Rizwiz Enterprises, which is our legal name." },
  { q: "Can I get a refund?", a: "Read the Refund and Cancellation page, then write to support@theaitimemachine.com from the email you paid with." },
  { q: "Is GST added on top?", a: "The amount you are asked to pay at checkout is ₹1,999. If a GST invoice is needed, write to support with the email you paid with and your GSTIN." },
];

export default function PricingPage() {
  return (
    <PageShell offer crumbs={[{ name: "Pricing", path: "/pricing" }]}>
      <p className="mk-kicker">Pricing</p>
      <h1>₹1,999 once</h1>
      <p className="mk-lead">No monthly fee. No per-seat charge for this purchase. You connect your own AI key for AI tasks, and that usage is billed by your provider.</p>
      <div className="mk-cta">
        <a className="btn btn-p" href="/checkout">Get AI Time Machine — ₹1,999</a>
        <Link className="btn btn-g" href="/55-ai-agents">See what is included</Link>
      </div>
      <p className="mk-note">The amount charged is ₹1,999 in rupees. Visitors outside India may see $24 on the offer page. Payments may show as Rizwiz Enterprises.</p>
      <h2>Pricing FAQ</h2>
      <div className="mk-faq">
        {faqs.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mk-note">Access is digital. After payment we email a sign-in code. See <Link href="/shipping-policy">Shipping and Delivery</Link> and <Link href="/refund-policy">Refund and Cancellation</Link>.</p>
    </PageShell>
  );
}
