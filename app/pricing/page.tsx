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
        <a className="btn btn-p" href="/api/checkout">
          Get AI Time Machine — ₹1,999
        </a>
      </p>
      <p>Access is digital and is sent by email and WhatsApp or SMS right after payment. See Shipping and Delivery and Refund and Cancellation.</p>
    </PolicyFrame>
  );
}
