import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = {
  title: "AI Time Machine",
  description: "AI Time Machine is a one-time tool for business owners. You stay in charge. Nothing goes out until you say yes.",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="brand-page">
        <section className="brand-hero">
          <div className="wrap">
            <p className="k">Rizwiz Enterprises</p>
            <h1>AI Time Machine</h1>
            <p className="lead">
              A one-time tool for owners who want help with everyday work. You see what is suggested. Nothing is posted, sent to a customer, or paid for until you say yes.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-p" href="/55-ai-agents">
                See the 55 agents
              </Link>
              <Link className="btn btn-g" href="/pricing">
                Pricing
              </Link>
            </div>
          </div>
        </section>
        <section className="brand-cards">
          <div className="wrap brand-grid">
            <article className="card">
              <small>The product</small>
              <h2>A team you can talk to</h2>
              <p>The 55-agent offer is a separate page. It shows what is included, the one-time price, and how buying works.</p>
              <Link href="/55-ai-agents">Open the 55 agents page</Link>
            </article>
            <article className="card">
              <small>You stay in charge</small>
              <h2>Yes before anything goes out</h2>
              <p>Agents can draft. They wait. One switch pauses the whole team. No post, message, or spend happens on its own.</p>
            </article>
            <article className="card">
              <small>One payment</small>
              <h2>₹1,999 once</h2>
              <p>No monthly fee. After you pay, access is sent by email and WhatsApp. Details are on the pricing page.</p>
              <p className="key-note">You connect your own AI key (Claude, ChatGPT or Grok) for AI tasks. AI usage is billed by your AI provider. AI Time Machine provides the skills and the platform to manage everything in one place.</p>
              <Link href="/pricing">Read the price</Link>
            </article>
          </div>
        </section>
        <section className="brand-trust">
          <div className="wrap">
            <h2>Plain facts</h2>
            <ul>
              <li>Sold by {BUSINESS.legalName}, {BUSINESS.address}.</li>
              <li>Payments go through Cashfree. We do not store your card or UPI pin.</li>
              <li>This is software. It does not promise sales, rankings, or health results.</li>
              <li>
                Questions: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a> or{" "}
                <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
              </li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
