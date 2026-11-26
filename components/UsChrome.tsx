import Link from "next/link";
import { BUSINESS, POLICY_LINKS } from "@/lib/business";
import { usFooterAddress, usPriceLabel, US_AGENTS_PATH, US_CHECKOUT_PATH, US_LANDING_PATH } from "@/lib/us";

export function UsHeader() {
  const price = usPriceLabel();
  return (
    <header className="nav nav-marketing">
      <div className="wrap">
        <Link className="logo" href={US_LANDING_PATH} aria-label="AI Time Machine US home">
          <i />
          AI Time Machine
        </Link>
        <div className="nav-cta">
          <Link className="si" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-p nav-buy" href={US_CHECKOUT_PATH}>
            Get {price}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function UsFooter() {
  const address = usFooterAddress();
  const price = usPriceLabel();
  return (
    <footer className="mega-foot us-foot">
      <div className="wrap">
        <div className="us-foot-grid">
          <div className="mega-brand">
            <Link className="logo" href={US_LANDING_PATH}>
              <i />
              AI Time Machine
            </Link>
            <p>Your AI team drafts. You decide.</p>
            <p className="foot-legal">
              <b>{BUSINESS.legalName}</b>
              {address ? (
                <>
                  <br />
                  {address}
                </>
              ) : null}
              <br />
              Support by email: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
            </p>
          </div>
          <nav className="mega-col" aria-label="US offer">
            <h3>Offer</h3>
            <Link href={US_LANDING_PATH}>US lifetime access</Link>
            <Link href={US_AGENTS_PATH}>55 agents offer</Link>
            <Link href={US_CHECKOUT_PATH}>Checkout · {price}</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/security">Security & trust</Link>
          </nav>
          <nav className="mega-col" aria-label="Policies">
            <h3>Policies</h3>
            {POLICY_LINKS.filter((link) => ["/privacy", "/terms", "/refund-policy", "/shipping-policy", "/contact", "/disclaimer", "/cookie-policy"].includes(link.href)).map(
              (link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
        <div className="mega-bottom">
          <small>© 2026 {BUSINESS.legalName} · AI Time Machine · Payments secured by Stripe</small>
        </div>
      </div>
    </footer>
  );
}
