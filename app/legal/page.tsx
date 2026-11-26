import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Legal",
  "Privacy, terms, refunds, shipping, cookies, acceptable use, disclaimer, and privacy rights for AI Time Machine.",
  "/legal",
);

const links = [
  { href: "/privacy", title: "Privacy policy", body: "What we keep, why, and how to ask about it." },
  { href: "/privacy-rights", title: "Privacy rights (DPDP and GDPR)", body: "A plain note on Indian DPDP rights, and what we can do for people in the EU or UK." },
  { href: "/terms", title: "Terms and conditions", body: "The agreement for the one-time purchase, AI keys, and Indian law." },
  { href: "/acceptable-use", title: "Acceptable use", body: "How the product may and may not be used." },
  { href: "/refund-policy", title: "Refund and cancellation", body: "How to ask about a refund." },
  { href: "/shipping-policy", title: "Shipping and delivery", body: "Access is digital. We email a sign-in code." },
  { href: "/cookie-policy", title: "Cookie policy", body: "The cookies we use to run the site and keep you signed in." },
  { href: "/disclaimer", title: "Disclaimer", body: "No promised sales, rankings, or health results." },
  { href: "/partners/terms", title: "Partner terms", body: "Terms for the affiliate and creator program." },
];

export default function LegalPage() {
  return (
    <PageShell crumbs={[{ name: "Legal", path: "/legal" }]}>
      <p className="mk-kicker">Legal</p>
      <h1>Legal centre</h1>
      <p className="mk-lead">All public legal pages for AI Time Machine and Rizwiz Enterprises, in one place.</p>
      <div className="mk-grid" style={{ marginTop: 36 }}>
        {links.map((item) => (
          <Link className="mk-card" key={item.href} href={item.href}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <span className="mk-more">Open</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
