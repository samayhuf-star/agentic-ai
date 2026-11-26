import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { useCases } from "@/content/use-cases";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Use cases",
  "How shop owners, cafes, local services, independent practices, clinics and online stores can use AI Time Machine. Examples, not case studies.",
  "/use-cases",
);

export default function UseCasesPage() {
  return (
    <PageShell crumbs={[{ name: "Use cases", path: "/use-cases" }]}>
      <p className="mk-kicker">Use cases</p>
      <h1>How different kinds of businesses can use the agents</h1>
      <p className="mk-lead">
        These pages describe realistic work, not customer logos or invented results. If a business like yours is not listed, the same rule still applies: drafts wait for your yes.
      </p>
      <div className="mk-grid" style={{ marginTop: 36 }}>
        {useCases.map((item) => (
          <Link className="mk-card" key={item.slug} href={`/use-cases/${item.slug}`}>
            <small>{item.kicker}</small>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <span className="mk-more">Read this use case</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
