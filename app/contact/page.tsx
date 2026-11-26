import { PageShell } from "@/components/marketing/PageShell";
import { BUSINESS } from "@/lib/business";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Contact",
  "Support for AI Time Machine is by email only: support@theaitimemachine.com. A real person reads it.",
  "/contact",
);

export default function ContactPage() {
  return (
    <PageShell crumbs={[{ name: "Contact", path: "/contact" }]}>
      <p className="mk-kicker">Contact</p>
      <h1>Email is the way to reach us</h1>
      <p className="mk-lead">Support is by email only. A real person reads mail to {BUSINESS.supportEmail}. We do not offer a phone helpdesk or a chat widget.</p>
      <div className="mk-grid-2" style={{ marginTop: 36 }}>
        <article className="mk-card">
          <small>Support</small>
          <h2>
            <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
          </h2>
          <p>For a payment problem, write from the email address you paid with, and include any payment reference you have. Do not send card details, UPI pins, or AI keys.</p>
          <p className="mk-more">
            <a className="btn btn-p" href={`mailto:${BUSINESS.supportEmail}`}>Write an email</a>
          </p>
        </article>
        <article className="mk-card">
          <small>Registered office</small>
          <h2>{BUSINESS.legalName}</h2>
          <p>
            {BUSINESS.address}
            <br />
            Delhi 110032, India
            <br />
            Registered business number: {BUSINESS.phone}
          </p>
          <p>That number is a registered contact, not a support line. Please use email.</p>
        </article>
      </div>
    </PageShell>
  );
}
