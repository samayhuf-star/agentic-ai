import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Terms and Conditions · AI Time Machine" };

export default function TermsPage() {
  return (
    <PolicyFrame title="Terms and Conditions">
      <p>
        These terms are between you and {BUSINESS.legalName}, {BUSINESS.address}. They cover AI Time Machine, a software tool sold for ₹1,999 once. There is no monthly fee for that purchase.
      </p>
      <p>
        AI features run on an AI provider account you connect (Anthropic, OpenAI or xAI). Those providers bill you separately under their own terms. The AI Time Machine fee does not include AI provider usage.
      </p>
      <p>You stay in charge. The software does not post, message your customers, or spend money until you say yes. The pause switch stops the team. Your AI team prepares drafts and ideas for you. Nothing goes out without your yes. Agents do not run on their own in the background yet.</p>
      <p>
        AI Time Machine does not promise sales, rankings, leads, or any business result. It is not medical advice and it does not treat, diagnose, or promise a health outcome. It does not replace an accountant, a lawyer, or a doctor. You are responsible for what you approve.
      </p>
      <p>Access is digital. After a successful payment we email you a sign-in code. See the Shipping and Delivery page and the Refund and Cancellation page.</p>
      <p>These terms follow the laws of India. Courts in Delhi, India, hear disputes about them.</p>
      <p>If something is wrong with a payment, write to {BUSINESS.supportEmail} with the phone number you paid from.</p>
    </PolicyFrame>
  );
}
