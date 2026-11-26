import Link from "next/link";
import { BUSINESS, POLICY_LINKS } from "@/lib/business";
import { FOOTER_COLUMNS } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";

export { SiteHeader };

export function LogoHeader() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="AI Time Machine">
          <i />
          AI Time Machine
        </Link>
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
    <footer className="mega-foot">
      <div className="wrap">
        <div className="mega-grid">
          <div className="mega-brand">
            <Link className="logo" href="/">
              <i />
              AI Time Machine
            </Link>
            <p>Your AI team drafts. You decide.</p>
            <p className="foot-legal">
              <b>{BUSINESS.legalName}</b>
              <br />
              {BUSINESS.address}
              <br />
              Support by email:{" "}
              <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} className="mega-col" aria-label={column.title}>
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="mega-bottom">
          <small>© 2026 {BUSINESS.legalName} · AI Time Machine · Payments secured by Cashfree</small>
          <nav className="foot-policies" aria-label="Policies">
            {POLICY_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

/** Footer without company details, for partner pages. */
export function MinimalFooter() {
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <Link className="logo" href="/">
            <i />
            AI Time Machine
          </Link>
        </div>
        <div className="foot-r">
          <nav className="foot-policies" aria-label="Partner links">
            <Link href="/partners/terms">Partner terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <small>© 2026 AI Time Machine</small>
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
          Support: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
