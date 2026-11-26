import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Partner program",
  "Share AI Time Machine with your audience and earn a commission on paid sales through your link. Apply by email after you send the form.",
  "/partners",
);

export default function PartnersPage() {
  return (
    <PageShell crumbs={[{ name: "Partners", path: "/partners" }]}>
      <p className="mk-kicker">Partners</p>
      <h1>Affiliate and creator program</h1>
      <p className="mk-lead">
        If you make content about tools for business owners, you can share AI Time Machine with a link that is yours. Paid sales through that link earn a commission, with 30-day tracking.
      </p>
      <ul className="mk-list">
        <li>Your own link, and a separate link for each post so you can see which post sold</li>
        <li>Commission on every paid sale through your link</li>
        <li>A private dashboard for clicks, sales and payouts</li>
        <li>Payouts to your UPI or bank account, which you add after approval</li>
      </ul>
      <p className="mk-note">
        We approve applications. Please only apply if you will describe the product accurately — including the one-time price, the fact that AI usage is billed by the provider whose key the buyer connects, and that nothing goes out until the owner says yes.
      </p>
      <div className="mk-cta">
        <Link className="btn btn-p" href="/partners/apply">Apply to become a partner</Link>
        <Link className="btn btn-g" href="/partners/terms">Read partner terms</Link>
      </div>
    </PageShell>
  );
}
