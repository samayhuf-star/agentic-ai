import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Acceptable use",
  "How you may use AI Time Machine, and the uses we do not allow.",
  "/acceptable-use",
);

export default function AcceptableUsePage() {
  return (
    <PolicyFrame title="Acceptable use">
      <p>
        These rules sit alongside the <a href="/terms">Terms and Conditions</a>. They apply to anyone who uses AI Time Machine, sold by {BUSINESS.legalName}.
      </p>
      <p>You may use the product to draft everyday business work — plans, messages, listings and reminders — and to approve or reject that work yourself.</p>
      <p>You may not:</p>
      <ul>
        <li>Use the product for fraud, scams, phishing, or to impersonate another person or business.</li>
        <li>Try to send spam, or to bypass the yes queue so that messages go out without approval.</li>
        <li>Upload or ask the product to generate illegal content, or sexual content involving minors.</li>
        <li>Attempt to break into the service, probe other customers’ accounts, or overload the site.</li>
        <li>Share a sign-in code or an AI provider key in a way that lets a stranger use someone else’s account.</li>
        <li>Use drafts as professional legal, medical, or financial advice, or present them as a human professional’s formal opinion.</li>
        <li>Resell access to the product as if you were us, unless you are in the partner program and following those terms.</li>
      </ul>
      <p>
        If we reasonably believe an account is breaking these rules, we may suspend access and write to the email on the account. Questions: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>.
      </p>
    </PolicyFrame>
  );
}
