import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Privacy rights (DPDP and GDPR)",
  "A plain note on rights under India’s DPDP Act, and how we handle requests from people in the EU or UK. We do not claim a certification we do not hold.",
  "/privacy-rights",
);

export default function PrivacyRightsPage() {
  return (
    <PolicyFrame title="Privacy rights (DPDP and GDPR)">
      <p>
        This note sits next to our <a href="/privacy">privacy policy</a>. {BUSINESS.legalName} is based in Delhi, India, and sells AI Time Machine to customers who pay in Indian rupees.
      </p>
      <h2>India — Digital Personal Data Protection Act, 2023</h2>
      <p>
        We process personal data to run your account: name, email, mobile, business profile, payment records from our payment processor (Razorpay), messages you type, and approvals. You can write to us to ask what we hold, to correct it, or to ask us to delete it, and we will handle that request as the law requires. We will also tell you if we cannot delete something we must keep for a legal or accounting reason.
      </p>
      <p>
        We do not sell personal data. Processors who help us run the product — including the payment company, the email sender, our hosting provider, and the AI provider whose key you connect — receive only what they need for that job. Chat text goes to that AI provider, which may process it outside India.
      </p>
      <p>We have not appointed a named Data Protection Officer on this site. Privacy requests go to {BUSINESS.supportEmail} and are read by a person at {BUSINESS.legalName}.</p>
      <h2>People in the EU, EEA, or UK</h2>
      <p>
        We do not market a separate EU product, and we do not claim GDPR certification. If you are in the EU, EEA, or UK and we hold your personal data, you can still write to us to access, correct, or delete it, or to ask us to restrict how we use it. We will consider the request in good faith and reply from {BUSINESS.supportEmail}.
      </p>
      <p>
        We do not currently offer a formal EU representative, and we do not use this page to claim that all processing stays inside a particular region. See also <a href="/security">Security and trust</a>.
      </p>
    </PolicyFrame>
  );
}
