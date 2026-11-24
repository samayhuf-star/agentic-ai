import Link from "next/link";
import { BUSINESS, POLICY_LINKS } from "@/lib/business";

export function SiteHeader({ offer = false }: { offer?: boolean }) {
  return (
    <header className="nav">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="AI Time Machine home">
          <i />
          AI Time Machine
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/55-ai-agents">55 agents</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="nav-cta">
          <Link className="si" href="/login">
            Sign in
          </Link>
          {offer ? (
            <a className="btn btn-p nav-buy" href="/checkout">
              Get ₹1,999 →
            </a>
          ) : (
            <Link className="btn btn-p nav-buy" href="/55-ai-agents">
              See the offer
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function QuietHeader() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="AI Time Machine">
          <i />
          AI Time Machine
        </Link>
        <div className="nav-cta">
          <Link className="btn btn-g" href="/login">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AccountHeader() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link className="logo" href="/onboarding" aria-label="AI Time Machine">
          <i />
          AI Time Machine
        </Link>
        <form className="nav-cta" action="/api/auth/logout" method="post">
          <button className="btn btn-g" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <Link className="logo" href="/">
            <i />
            AI Time Machine
          </Link>
          <p className="foot-tag">Your AI team drafts. You decide.</p>
          <p className="foot-legal">
            <b>{BUSINESS.legalName}</b>
            <br />
            {BUSINESS.address}
            <br />
            {BUSINESS.phone}
            <br />
            <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
          </p>
        </div>
        <div className="foot-r">
          <nav className="foot-policies" aria-label="Policies">
            {POLICY_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <small>© 2026 {BUSINESS.legalName} · AI Time Machine · Payments secured by Cashfree</small>
        </div>
      </div>
    </footer>
  );
}

export function PolicyFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap policy prose">
        <h1>{title}</h1>
        {children}
        <p>
          {BUSINESS.legalName}
          <br />
          {BUSINESS.address}
          <br />
          {BUSINESS.phone}
          <br />
          <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
