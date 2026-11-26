import { PageShell } from "@/components/marketing/PageShell";
import { BUSINESS } from "@/lib/business";
import { pageMeta, SITE } from "@/lib/site";

export const metadata = pageMeta(
  "Press and media kit",
  "Logos, a short fact sheet, and a press email for AI Time Machine, a product of Rizwiz Enterprises.",
  "/press",
);

export default function PressPage() {
  return (
    <PageShell crumbs={[{ name: "Press", path: "/press" }]}>
      <p className="mk-kicker">Newsroom</p>
      <h1>Press and media kit</h1>
      <p className="mk-lead">
        This page is for journalists and partners who need a clear description of the product, our legal name, and logos they can use. We do not list press coverage we have not received.
      </p>

      <h2>Fact sheet</h2>
      <table className="mk-table">
        <tbody>
          <tr><th>Product</th><td>{SITE.name}</td></tr>
          <tr><th>Legal entity</th><td>{SITE.legalName}, {SITE.address}, Delhi 110032, India</td></tr>
          <tr><th>Founder</th><td>{SITE.founder}</td></tr>
          <tr><th>What it is</th><td>A one-time software tool with 55 AI agents across eight teams. Agents draft plans, messages and reminders. Nothing is posted, sent, or spent until the owner says yes.</td></tr>
          <tr><th>Price</th><td>₹1,999 once. No monthly fee for that purchase. AI usage is billed by the provider whose key the customer connects (Claude, ChatGPT or Grok).</td></tr>
          <tr><th>Payments</th><td>Taken in Indian rupees through Cashfree. The charge may show as Rizwiz Enterprises.</td></tr>
          <tr><th>Support</th><td>Email only: {BUSINESS.supportEmail}</td></tr>
          <tr><th>Website</th><td><a href={SITE.url}>{SITE.url.replace("https://", "")}</a></td></tr>
        </tbody>
      </table>

      <h2>Boilerplate</h2>
      <div className="mk-prose">
        <p>
          AI Time Machine is a one-time software tool from Rizwiz Enterprises, Delhi. It gives a business owner 55 AI agents across marketing, support, sales, content, SEO, operations, money, and a small CEO office. The agents prepare drafts and ideas. The owner approves anything that would go out to a customer, appear in public, or spend money. AI features run on a key the owner already has with Anthropic, OpenAI or xAI.
        </p>
      </div>

      <h2>Logos</h2>
      <p className="mk-note">Please keep clear space around the mark, and do not recolour it or add a drop shadow. Use the ink version on light backgrounds and the lime version on dark backgrounds.</p>
      <div className="mk-media">
        <a href="/media-kit/logo-1080.png" download>
          <img src="/media-kit/logo-1080.png" alt="AI Time Machine logo, 1080 pixel square" />
          Full logo (PNG, 1080×1080)
        </a>
        <a href="/media-kit/logo-lime.png" download>
          <img src="/media-kit/logo-lime.png" alt="Lime logo on dark" />
          Lime mark (PNG)
        </a>
        <a href="/media-kit/logo-ink.png" download>
          <img src="/media-kit/logo-ink.png" alt="Ink logo on light" style={{ background: "#eef2f0" }} />
          Ink mark (PNG)
        </a>
      </div>

      <h2>Coverage</h2>
      <div className="mk-prose">
        <p>
          We will add links here when independent coverage is published. Until then this section stays empty on purpose — we would rather show a short page than invent headlines.
        </p>
        <p>
          Press enquiries: <a href={`mailto:${BUSINESS.supportEmail}?subject=Press`}>{BUSINESS.supportEmail}</a>, subject line “Press”.
        </p>
      </div>
    </PageShell>
  );
}
