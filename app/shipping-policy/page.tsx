import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Shipping and Delivery · AI Time Machine" };

export default function ShippingPage() {
  return (
    <PolicyFrame title="Shipping and Delivery">
      <p>AI Time Machine is a digital product. Nothing is posted by courier. There is no physical shipment, shipping fee, or delivery address to enter.</p>
      <p>
        After a successful payment, access is delivered instantly. You get a link by email and by WhatsApp or SMS on the phone number used at checkout. You add your email, type a one-time code, and open your account.
      </p>
      <p>If the link does not arrive within a few minutes, check the phone number you paid with, then write to {BUSINESS.supportEmail}. Support is by email only. We will resend access.</p>
    </PolicyFrame>
  );
}
