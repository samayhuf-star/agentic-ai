import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Terms and Conditions · AI Time Machine" };

export default function TermsPage() {
  return (
    <PolicyFrame title="Terms and Conditions">
      <p>
        These terms are between you and {BUSINESS.legalName}, {BUSINESS.address}. They cover AI Time Machine, a software tool sold for ₹1,999 once. There is no monthly fee for that purchase.
      </p>
      <p>You stay in charge. The software does not post, message your customers, or spend money until you say yes. The pause switch stops the team.</p>
      <p>
        AI Time Machine does not promise sales, rankings, leads, or any business result. It is not medical advice and it does not treat, diagnose, or promise a health outcome. It does not replace an accountant, a lawyer, or a doctor. You are responsible for what you approve.
      </p>
      <p>Access is digital. After a successful payment we send a link by email and by WhatsApp or SMS. See the Shipping and Delivery page and the Refund and Cancellation page.</p>
      <p>These terms follow the laws of India. Courts in Delhi, India, hear disputes about them.</p>
      <p>If something is wrong with a payment, write to {BUSINESS.supportEmail} with the phone number you paid from.</p>
    </PolicyFrame>
  );
}
