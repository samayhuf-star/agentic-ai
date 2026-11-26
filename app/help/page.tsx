import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { helpArticles } from "@/content/help";
import { BUSINESS } from "@/lib/business";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Help centre",
  "Short guides for signing in, connecting your AI key, the yes queue, payments and refunds. Support is by email only.",
  "/help",
);

export default function HelpPage() {
  return (
    <PageShell crumbs={[{ name: "Help centre", path: "/help" }]}>
      <p className="mk-kicker">Help</p>
      <h1>Help centre</h1>
      <p className="mk-lead">
        Short guides for the basics. If you cannot find an answer, email <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a> — support is by email only.
      </p>
      <div className="mk-grid" style={{ marginTop: 36 }}>
        {helpArticles.map((item) => (
          <Link className="mk-card" key={item.slug} href={`/help/${item.slug}`}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span className="mk-more">Read the guide</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
