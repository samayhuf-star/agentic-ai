import { PolicyFrame } from "@/components/SiteChrome";

export const metadata = { title: "Pricing · AI Time Machine" };

export default function PricingPage() {
  return (
    <PolicyFrame title="Pricing">
      <p>
        <b>₹1,999 once.</b> No monthly fee. No per-seat charge for this purchase.
      </p>
      <p>
        What is included, the launch countdown, and the buy button are on the <a href="/55-ai-agents">55 agents page</a>. The amount charged is ₹1,999 in rupees. Visitors outside India may see $24 on that page. The payment is still taken in rupees.
      </p>
      <p>
        <a className="btn btn-p" href="/checkout">
          Get AI Time Machine — ₹1,999
        </a>
      </p>
      <p className="key-note">You connect your own AI key (Claude, ChatGPT or Grok) for AI tasks. AI usage is billed by your AI provider. AI Time Machine provides the skills and the platform to manage everything in one place.</p>
      <p className="key-note">Your AI team prepares drafts and ideas for you. Nothing goes out without your yes. Agents do not run on their own in the background yet.</p>
      <p>Access is digital. After payment we email a sign-in code. See Shipping and Delivery and Refund and Cancellation.</p>
    </PolicyFrame>
  );
}
