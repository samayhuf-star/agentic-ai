import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Shipping and Delivery · AI Time Machine" };

export default function ShippingPage() {
  return (
    <PolicyFrame title="Shipping and Delivery">
      <p>AI Time Machine is a digital product. Nothing is posted by courier. There is no physical shipment, shipping fee, or delivery address to enter.</p>
      <p>
        After a successful payment, access is delivered on this site. We email a one-time code to the address you entered before paying. Type that code to open your account.
      </p>
      <p>If the code does not arrive within a few minutes, check the email you entered, then write to {BUSINESS.supportEmail}. Support is by email only. We will resend access.</p>
    </PolicyFrame>
  );
}
