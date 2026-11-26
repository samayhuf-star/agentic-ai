import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/marketing/PageShell";
import { agents } from "@/data/agents";
import { pageMeta } from "@/lib/site";

export function generateStaticParams() {
  return agents.map((agent) => ({ id: agent.id }));
}

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return params.then((p) => {
    const agent = agents.find((item) => item.id === p.id);
    if (!agent) return {};
    return pageMeta(`${agent.name}, ${agent.role}`, agent.blurb, `/agents/${agent.id}`);
  });
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = agents.find((item) => item.id === id);
  if (!agent) notFound();
  const peers = agents.filter((item) => item.department === agent.department && item.id !== agent.id).slice(0, 6);
  return (
    <PageShell crumbs={[{ name: "Agents", path: "/agents" }, { name: agent.name, path: `/agents/${agent.id}` }]}>
      <p className="mk-kicker">{agent.department}</p>
      <h1>
        {agent.name} <span style={{ color: "var(--dim)", fontWeight: 600 }}>— {agent.role}</span>
      </h1>
      <p className="mk-lead">{agent.blurb}</p>
      <div className="mk-split">
        <div className="mk-prose">
          <h2>How this agent works</h2>
          <p>
            {agent.name} is part of the {agent.department} team in AI Time Machine. You can ask for a draft in this role, review it, and approve it or leave it. Nothing is posted, sent to a customer, or spent until you say yes.
          </p>
          <p>
            Like the rest of the team, {agent.name} uses the AI provider key you connect, and does not run unattended in the background yet. If you want a quiet period, pause the whole team from the dashboard.
          </p>
          <p>
            The one-time offer that includes this agent is on the <Link href="/55-ai-agents">55 agents page</Link>. For team-level help, see <Link href="/solutions">solutions</Link>.
          </p>
        </div>
        <aside className="mk-aside">
          <h3>Others in {agent.department}</h3>
          <ul className="mk-list">
            {peers.map((item) => (
              <li key={item.id}>
                <Link href={`/agents/${item.id}`}>{item.name}</Link> — {item.role}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
