import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Privacy · AI Time Machine" };

export default function PrivacyPage() {
  return (
    <PolicyFrame title="Privacy">
      <p>
        {BUSINESS.legalName} (“we”) runs AI Time Machine. This page says what we keep and why.
      </p>
      <ul>
        <li>Your name, email and mobile from checkout. We email a 6-digit sign-in code to that address.</li>
        <li>The email you add, so we can send a one-time code and the welcome note.</li>
        <li>Your business name, what you sell, and the goal you pick.</li>
        <li>A record of the payment from the payment company. We do not store your card number or UPI pin.</li>
        <li>Messages you type to an agent, and the yes or no you give. Chat text is sent to the AI provider whose key you connect.</li>
        <li>Your AI key, stored encrypted. We use it only to send your chats to that provider.</li>
        <li>A sign-in cookie on your browser so you stay signed in.</li>
      </ul>
      <p>
        We use this to run your account. We do not sell it. The payment company, the email sender, and the text sender only get what they need to do their job.
      </p>
      <p>
        To see where checkout gets stuck, we may use Microsoft Clarity on the landing page, the checkout form and the payment-return page only. Clarity records a session replay of those pages. Names, emails, phone numbers and all form inputs are masked. Clarity is never loaded on the Cashfree or Razorpay payment page, and it does not run on your dashboard or admin pages.
      </p>
      <p>You can ask what we hold, or ask us to correct it, by writing to {BUSINESS.supportEmail}. We reply from that address.</p>
    </PolicyFrame>
  );
}
