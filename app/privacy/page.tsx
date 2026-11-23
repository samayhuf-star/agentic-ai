import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Privacy · AI Time Machine" };

export default function PrivacyPage() {
  return (
    <PolicyFrame title="Privacy">
      <p>
        {BUSINESS.legalName} (“we”) runs AI Time Machine at {BUSINESS.domain}. This page says what we keep and why.
      </p>
      <ul>
        <li>Your phone number, from the payment, so we can send the access link.</li>
        <li>The email you add, so we can send a one-time code and the welcome note.</li>
        <li>Your business name, what you sell, and the goal you pick.</li>
        <li>A record of the payment from the payment company. We do not store your card number or UPI pin.</li>
        <li>Messages you type to an agent, and the yes or no you give.</li>
        <li>A sign-in cookie on your browser so you stay signed in.</li>
      </ul>
      <p>
        We use this to run your account. We do not sell it. The payment company, the email sender, and the text sender only get what they need to do their job.
      </p>
      <p>You can ask what we hold, or ask us to correct it, by writing to {BUSINESS.supportEmail}. We reply from that address.</p>
    </PolicyFrame>
  );
}
