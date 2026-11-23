import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Refund and Cancellation · AI Time Machine" };

export default function RefundPage() {
  return (
    <PolicyFrame title="Refund and Cancellation">
      <p>AI Time Machine is a digital product. The price is ₹1,999, paid once. There is no monthly plan to cancel.</p>
      <p>
        Access is sent straight after payment, by email and by WhatsApp or SMS. Because delivery is immediate, write to us within 7 days of payment if you did not receive access, or if you could not sign in.
      </p>
      <p>
        Email {BUSINESS.supportEmail} or call {BUSINESS.phone}. Include the phone number you paid with. If we cannot give you access, we refund that payment to the original method. We do not refund because of a hoped-for sales or marketing result. The product does not promise those results.
      </p>
      <p>A refund, when approved, is started within 7 business days. Your bank or UPI app may take longer to show it.</p>
    </PolicyFrame>
  );
}
