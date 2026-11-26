import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/marketing/PageShell";
import { getUseCase, useCases } from "@/content/use-cases";
import { agents } from "@/data/agents";
import { pageMeta } from "@/lib/site";

export function generateStaticParams() {
  return useCases.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then((p) => {
    const item = getUseCase(p.slug);
    if (!item) return {};
    return pageMeta(item.title, item.summary, `/use-cases/${item.slug}`);
  });
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getUseCase(slug);
  if (!item) notFound();
  const roster = item.agents.map((id) => agents.find((agent) => agent.id === id)).filter(Boolean);
  return (
    <PageShell crumbs={[{ name: "Use cases", path: "/use-cases" }, { name: item.title, path: `/use-cases/${item.slug}` }]}>
      <p className="mk-kicker">{item.kicker}</p>
      <h1>{item.title}</h1>
      <p className="mk-lead">{item.summary}</p>
      <p className="mk-note">{item.who}</p>
      <h2>A day that might look like this</h2>
      <ul className="mk-list">
        {item.day.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mk-note">{item.note}</p>
      <h2>Agents often involved</h2>
      <ul className="mk-list">
        {roster.map((agent) =>
          agent ? (
            <li key={agent.id}>
              <Link href={`/agents/${agent.id}`}>{agent.name}</Link> — {agent.role}
            </li>
          ) : null,
        )}
      </ul>
      <div className="mk-cta">
        <Link className="btn btn-p" href="/55-ai-agents">See the offer</Link>
        <Link className="btn btn-g" href="/solutions">Browse solutions</Link>
      </div>
    </PageShell>
  );
}
