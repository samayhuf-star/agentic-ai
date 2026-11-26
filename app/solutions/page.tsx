import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { solutions } from "@/content/solutions";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Solutions",
  "How AI Time Machine helps with sales, marketing, support, finance, operations, and daily rhythm — with an honest limit on HR.",
  "/solutions",
);

export default function SolutionsPage() {
  return (
    <PageShell crumbs={[{ name: "Solutions", path: "/solutions" }]}>
      <p className="mk-kicker">Solutions</p>
      <h1>Help by the work you already do</h1>
      <p className="mk-lead">
        Each area maps to agents that already exist in the product. Drafts wait for your yes. We also say what a team cannot do.
      </p>
      <div className="mk-grid" style={{ marginTop: 36 }}>
        {solutions.map((item) => (
          <Link className="mk-card" key={item.slug} href={`/solutions/${item.slug}`}>
            <small>{item.kicker}</small>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <span className="mk-more">Read this solution</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
