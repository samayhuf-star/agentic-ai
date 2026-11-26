import Link from "next/link";
import { UsFooter, UsHeader } from "@/components/UsChrome";
import { BUSINESS } from "@/lib/business";
import { pageMeta } from "@/lib/site";
import { usFooterAddress, usPriceLabel, US_CHECKOUT_PATH } from "@/lib/us";

export const dynamic = "force-dynamic";

export const metadata = pageMeta(
  "AI Time Machine for US owners — $49.99 lifetime",
  "A one-time $49.99 tool with 55 agents that draft everyday business work. You approve what goes out. No monthly fee for this purchase.",
  "/us",
);

const pains = [
  {
    title: "The messages wait until night",
    body: "Replies, quotes, and simple customer questions pile up after the shop closes. A draft waiting for your yes is faster than starting from a blank screen at 9 p.m.",
  },
  {
    title: "Follow-ups slip",
    body: "The sale often dies in the gap between “I’ll get back to you” and actually writing back. Agents can prepare a reminder or a follow-up. You still send it.",
  },
  {
    title: "Marketing gets postponed",
    body: "Posts, offers, and emails get pushed because the day’s work comes first. You get a draft to edit, not a robot posting in your name.",
  },
];

const steps = [
  {
    n: "01",
    title: "Tell us about the business",
    body: "Your name, what you sell, and a starting goal. Drafts should sound like your shop, not a stranger.",
  },
  {
    n: "02",
    title: "Agents prepare the work",
    body: "Plans, replies, offers, invoices and reminders land as drafts. You connect your own AI key for those tasks.",
  },
  {
    n: "03",
    title: "Nothing goes out without a yes",
    body: "Approve, edit, or leave it. One switch pauses the team. Agents do not run on their own in the background yet.",
  },
];

const faqs = [
  {
    q: "Is $49.99 really a one-time price?",
    a: "Yes. This US offer is $49.99 once for lifetime access to AI Time Machine. There is no monthly fee and no per-seat charge for this purchase.",
  },
  {
    q: "Does $49.99 include ChatGPT or Claude usage?",
    a: "No. You connect your own AI key (Claude, ChatGPT or Grok). That provider bills you separately. AI Time Machine provides the skills and the place to manage drafts.",
  },
  {
    q: "Do agents run by themselves?",
    a: "Not yet. Your team prepares drafts and ideas. Nothing is posted, sent, or paid for until you say yes.",
  },
  {
    q: "How do I get access after I pay?",
    a: "Access is digital. After Stripe confirms the payment, we email a sign-in code to the address you paid with. Sign in with that code — the same account login used on the rest of the site.",
  },
  {
    q: "Who will the charge show as?",
    a: "The payment goes through Stripe, and the charge may show as Rizwiz Enterprises, which is our legal name.",
  },
  {
    q: "Can I get a refund?",
    a: "Read the Refund and Cancellation page, then write to support@theaitimemachine.com from the email you paid with.",
  },
];

export default function UsLandingPage() {
  const price = usPriceLabel();
  const address = usFooterAddress();
  return (
    <>
      <UsHeader />
      <main className="brand-page us-page">
        <section className="brand-hero us-hero">
          <div className="wrap">
            <p className="k">Lifetime access · {price} once · Ages 35+</p>
            <h1>Keep your evenings. Let a team draft the busywork.</h1>
            <p className="lead">
              AI Time Machine is a one-time tool for owners who are tired of writing the same replies, follow-ups, and posts after a full day of work. Fifty-five agents prepare drafts. You decide what goes out.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-p" href={US_CHECKOUT_PATH}>
                Get lifetime access — {price}
              </Link>
              <Link className="btn btn-g" href="/login">
                Sign in
              </Link>
            </div>
            <p className="us-hero-note">No monthly fee for this purchase. Stripe takes the payment. You get a sign-in code by email.</p>
          </div>
        </section>

        <section className="mk-home-section">
          <div className="wrap">
            <div className="sec-h">
              <p className="k">Why people pay</p>
              <h2>The work that steals the night</h2>
              <p>These are common pressures, not a promise of more sales, rankings, or free time.</p>
            </div>
            <div className="mk-grid">
              {pains.map((item) => (
                <article className="mk-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mk-home-section">
          <div className="wrap">
            <div className="sec-h">
              <p className="k">How it works</p>
              <h2>Three steps, and you stay in charge</h2>
            </div>
            <div className="mk-grid">
              {steps.map((item) => (
                <article className="mk-card" key={item.n}>
                  <small>{item.n}</small>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mk-home-section">
          <div className="wrap">
            <div className="sec-h">
              <p className="k">The offer</p>
              <h2>{price} once, lifetime access</h2>
            </div>
            <div className="mk-grid">
              <article className="mk-card">
                <h3>What you get</h3>
                <p>The 55 agents, your dashboard, and lifetime access to this software after a confirmed payment. This is a tool, not a staff member and not a results contract.</p>
              </article>
              <article className="mk-card">
                <h3>What you pay</h3>
                <p>{price} once, in US dollars, through Stripe. There is no monthly fee for this purchase. AI usage is billed by the provider whose key you connect.</p>
              </article>
              <article className="mk-card">
                <h3>What you control</h3>
                <p>You approve drafts before anything goes out. You can pause the team. Agents do not run on their own in the background yet.</p>
              </article>
            </div>
            <div className="hero-ctas" style={{ marginTop: 28 }}>
              <Link className="btn btn-p" href={US_CHECKOUT_PATH}>
                Continue to checkout — {price}
              </Link>
            </div>
          </div>
        </section>

        <section className="mk-home-section">
          <div className="wrap">
            <div className="sec-h">
              <p className="k">Trust</p>
              <h2>Plain facts</h2>
            </div>
            <div className="mk-grid">
              <article className="mk-card">
                <h3>One payment</h3>
                <p>{price} once, through Stripe. The charge may show as {BUSINESS.legalName}. We do not store your card number.</p>
              </article>
              <article className="mk-card">
                <h3>Your key, encrypted</h3>
                <p>You connect a Claude, ChatGPT or Grok key. We store it encrypted. Usage is billed by that provider, not included in our fee.</p>
              </article>
              <article className="mk-card">
                <h3>Email support</h3>
                <p>A person reads {BUSINESS.supportEmail}. We do not run a chat widget or a phone helpdesk.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="mk-home-section">
          <div className="wrap">
            <div className="sec-h">
              <p className="k">Questions</p>
              <h2>Pricing and access</h2>
            </div>
            <div className="mk-faq">
              {faqs.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="brand-trust">
          <div className="wrap">
            <h2>Sold by {BUSINESS.legalName}</h2>
            <ul>
              {address ? <li>{address}</li> : null}
              <li>This is software. It does not promise sales, rankings, or any particular result.</li>
              <li>
                Questions: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>.
              </li>
            </ul>
            <div className="hero-ctas" style={{ marginTop: 28 }}>
              <Link className="btn btn-p" href={US_CHECKOUT_PATH}>
                Get lifetime access — {price}
              </Link>
            </div>
          </div>
        </section>

        <div className="us-sticky">
          <a className="btn btn-p" href={US_CHECKOUT_PATH}>
            Get {price} lifetime access
          </a>
        </div>
      </main>
      <UsFooter />
    </>
  );
}
