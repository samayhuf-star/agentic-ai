import { PageShell } from "@/components/marketing/PageShell";
import { BUSINESS } from "@/lib/business";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Security and trust",
  "How AI Time Machine handles accounts, payments, encryption of AI keys, and data. Stated honestly, with no certifications we do not hold.",
  "/security",
);

export default function SecurityPage() {
  return (
    <PageShell crumbs={[{ name: "Security & trust", path: "/security" }]}>
      <p className="mk-kicker">Trust</p>
      <h1>Security and trust</h1>
      <p className="mk-lead">
        You should know what we protect, what we do not hold, and where we have not been independently certified. This page is that list, in plain language.
      </p>
      <div className="mk-prose" style={{ marginTop: 28 }}>
        <h2>Accounts and sign-in</h2>
        <p>
          Sign-in uses a 6-digit code emailed to you. We do not store a password for your AI Time Machine account. A sign-in cookie keeps you signed in on that browser.
        </p>
        <h2>Payments</h2>
        <p>
          Payments are taken by Cashfree, in Indian rupees. We keep a record of the payment from the payment company. We do not store your card number or UPI pin. The charge may show as {BUSINESS.legalName}.
        </p>
        <h2>AI keys</h2>
        <p>
          If you connect an AI provider key, we store it encrypted with AES-256-GCM. We use it only to send your chats to that provider. We do not use your key for other customers.
        </p>
        <h2>Chat and business details</h2>
        <p>
          We keep your name, email, mobile, business profile, messages you type to an agent, and the yes or no you give, so we can run your account. Chat text is sent to the AI provider whose key you connect, and that provider may process it outside India. We do not sell your data.
        </p>
        <h2>Transport and hosting</h2>
        <p>
          The site is served over HTTPS. We send a Strict-Transport-Security header. The product is hosted on cloud infrastructure. We do not claim that all data stays in India.
        </p>
        <h2>Certifications we do not have</h2>
        <p>
          We do not currently hold SOC 2, ISO 27001, PCI DSS, or a formal GDPR certification. Cashfree is our payment processor and has its own compliance programme for card data. We would rather say this plainly than display badges we have not earned.
        </p>
        <h2>Your rights and how to reach us</h2>
        <p>
          You can ask what we hold, ask us to correct it, or ask us to delete it, as described in our <a href="/privacy">privacy policy</a> and <a href="/privacy-rights">privacy rights note</a>. Write to{" "}
          <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>. See also the public <a href="/status">status page</a>.
        </p>
      </div>
    </PageShell>
  );
}
