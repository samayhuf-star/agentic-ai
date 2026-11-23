import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Contact · AI Time Machine" };

export default function ContactPage() {
  return (
    <PolicyFrame title="Contact">
      <p>A real person reads mail to {BUSINESS.supportEmail}.</p>
      <p>
        Email: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
        <br />
        Phone: <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
        <br />
        {BUSINESS.legalName}
        <br />
        {BUSINESS.address}
      </p>
      <p>For a payment problem, include the phone number you paid with.</p>
    </PolicyFrame>
  );
}
