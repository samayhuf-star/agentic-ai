import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/marketing/PageShell";
import { solutionBySlug, solutions } from "@/content/solutions";
import { agents } from "@/data/agents";
import { pageMeta } from "@/lib/site";

export function generateStaticParams() {
  return solutions.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then((p) => {
    const item = solutionBySlug(p.slug);
    if (!item) return {};
    return pageMeta(item.kicker, item.summary, `/solutions/${item.slug}`);
  });
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = solutionBySlug(slug);
  if (!item) notFound();
  const roster = item.agents.map((id) => agents.find((agent) => agent.id === id)).filter(Boolean);
  return (
    <PageShell crumbs={[{ name: "Solutions", path: "/solutions" }, { name: item.kicker, path: `/solutions/${item.slug}` }]}>
      <p className="mk-kicker">{item.kicker}</p>
      <h1>{item.title}</h1>
      <p className="mk-lead">{item.summary}</p>
      <div className="mk-split">
        <div>
          <h2>The problem</h2>
          <p className="mk-note" style={{ fontSize: 17, color: "#c3ccc8" }}>{item.problem}</p>
          <h2>What the agents can prepare</h2>
          <ul className="mk-list">
            {item.help.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h2>Honest limits</h2>
          <ul className="mk-list">
            {item.limits.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mk-cta">
            <Link className="btn btn-p" href="/55-ai-agents">See the 55-agent offer</Link>
            <Link className="btn btn-g" href="/agents">Browse all agents</Link>
          </div>
        </div>
        <aside className="mk-aside">
          <h3>Agents in this area</h3>
          <ul className="mk-list">
            {roster.map((agent) =>
              agent ? (
                <li key={agent.id}>
                  <Link href={`/agents/${agent.id}`}>{agent.name}</Link> — {agent.role}
                </li>
              ) : null,
            )}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
