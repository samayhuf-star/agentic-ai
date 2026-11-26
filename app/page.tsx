import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { allPosts } from "@/content/blog";
import { solutions } from "@/content/solutions";
import { useCases } from "@/content/use-cases";
import { BUSINESS } from "@/lib/business";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "AI Time Machine",
  "A one-time tool with 55 AI agents for business owners. You see what is suggested. Nothing is posted, sent, or paid for until you say yes.",
  "/",
);

export default function HomePage() {
  const posts = allPosts().slice(0, 3);
  return (
    <>
      <SiteHeader />
      <main className="brand-page">
        <section className="brand-hero">
          <div className="wrap">
            <p className="k">55 agents · eight teams · one yes</p>
            <h1>Your AI team drafts. You decide.</h1>
            <p className="lead">
              AI Time Machine is a one-time tool for owners who want help with everyday work — marketing, replies, follow-ups, and reminders — without giving a system permission to talk to customers on its own.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-p" href="/55-ai-agents">
                See the 55 agents
              </Link>
              <Link className="btn btn-g" href="/pricing">
                Pricing, ₹1,999 once
              </Link>
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
              <article className="mk-card">
                <small>01</small>
                <h3>Tell us about the business</h3>
                <p>Your name, what you sell, and a starting goal. Drafts should sound like your shop, not a stranger.</p>
              </article>
              <article className="mk-card">
                <small>02</small>
                <h3>Agents prepare the work</h3>
                <p>Plans, replies, offers, invoices and reminders land as drafts. You connect your own AI key for those tasks.</p>
              </article>
              <article className="mk-card">
                <small>03</small>
                <h3>Nothing goes out without a yes</h3>
                <p>Approve, edit, or leave it. One switch pauses the team. Agents do not run on their own in the background yet.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="mk-home-section">
          <div className="wrap">
            <div className="sec-h">
              <p className="k">Solutions</p>
              <h2>Help by the work you already do</h2>
            </div>
            <div className="mk-grid">
              {solutions.map((item) => (
                <Link className="mk-card" key={item.slug} href={`/solutions/${item.slug}`}>
                  <small>{item.kicker}</small>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <span className="mk-more">Open</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mk-home-section">
          <div className="wrap">
            <div className="sec-h">
              <p className="k">Use cases</p>
              <h2>Written for owners, not invented logos</h2>
              <p>Examples of how different businesses can use the agents. These are not case studies and they are not a promise of results.</p>
            </div>
            <div className="mk-grid">
              {useCases.map((item) => (
                <Link className="mk-card" key={item.slug} href={`/use-cases/${item.slug}`}>
                  <small>{item.kicker}</small>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <span className="mk-more">Open</span>
                </Link>
              ))}
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
                <p>₹1,999 once, through Cashfree. The charge may show as {BUSINESS.legalName}. We do not store your card or UPI pin.</p>
                <Link className="mk-more" href="/pricing">Pricing FAQ</Link>
              </article>
              <article className="mk-card">
                <h3>Your key, encrypted</h3>
                <p>You connect a Claude, ChatGPT or Grok key. We store it encrypted. Usage is billed by that provider, not included in our fee.</p>
                <Link className="mk-more" href="/security">Security & trust</Link>
              </article>
              <article className="mk-card">
                <h3>Email support</h3>
                <p>A person reads {BUSINESS.supportEmail}. We do not run a chat widget or a phone helpdesk.</p>
                <Link className="mk-more" href="/contact">Contact</Link>
              </article>
            </div>
          </div>
        </section>

        {posts.length > 0 ? (
          <section className="mk-home-section">
            <div className="wrap">
              <div className="sec-h">
                <p className="k">Journal</p>
                <h2>From the blog</h2>
              </div>
              <div className="mk-grid">
                {posts.map((post) => (
                  <Link className="mk-card" key={post.slug} href={`/blog/${post.slug}`}>
                    <img className="mk-hero-img" src={post.hero} alt="" style={{ margin: "0 0 14px", borderRadius: 12 }} />
                    <small>{post.kicker}</small>
                    <h3>{post.title}</h3>
                    <p>{post.description}</p>
                    <span className="mk-more">Read</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="brand-trust">
          <div className="wrap">
            <h2>Sold by {BUSINESS.legalName}</h2>
            <ul>
              <li>{BUSINESS.address}, Delhi 110032, India.</li>
              <li>This is software. It does not promise sales, rankings, or health results.</li>
              <li>
                Questions: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>.
              </li>
            </ul>
            <div className="hero-ctas" style={{ marginTop: 28 }}>
              <Link className="btn btn-p" href="/55-ai-agents">See the offer</Link>
              <Link className="btn btn-g" href="/about">About the company</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
