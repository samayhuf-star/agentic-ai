import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { agents, DEPARTMENTS } from "@/data/agents";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "55 AI agents",
  "A directory of all 55 AI Time Machine agents, grouped by team. Each agent drafts work in their role. Nothing goes out until you say yes.",
  "/agents",
);

export default function AgentsDirectoryPage() {
  return (
    <PageShell crumbs={[{ name: "Agents", path: "/agents" }]}>
      <p className="mk-kicker">Directory</p>
      <h1>All 55 agents, in eight teams</h1>
      <p className="mk-lead">
        This is the full roster. Each name has a role and a short description. For the one-time offer, price and bonuses, see the <Link href="/55-ai-agents">55 agents offer page</Link>.
      </p>
      {DEPARTMENTS.map((dept) => (
        <section className="mk-dept" key={dept.name}>
          <h2>
            <span className="mk-agent-dot" style={{ background: dept.color }} />
            {dept.name}
          </h2>
          <div className="mk-grid">
            {agents
              .filter((agent) => agent.department === dept.name)
              .map((agent) => (
                <Link className="mk-card" key={agent.id} href={`/agents/${agent.id}`}>
                  <small>{agent.role}</small>
                  <h3>{agent.name}</h3>
                  <p>{agent.blurb}</p>
                  <span className="mk-more">View agent</span>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </PageShell>
  );
}
