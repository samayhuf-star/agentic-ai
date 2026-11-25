import { AdminKicker } from "@/components/admin/AdminKicker";
import { AgentEditor } from "@/components/admin/console/AgentEditor";
import { requireAdminPage } from "@/lib/admin/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ dept?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const { dept } = await searchParams;
  const [agents, enabled, chats] = await Promise.all([
    prisma.agent.findMany({ orderBy: { sort: "asc" } }),
    prisma.userAgent.groupBy({ by: ["agentId"], where: { enabled: true }, _count: { _all: true } }),
    prisma.message.groupBy({ by: ["agentId"], where: { role: "user" }, _count: { _all: true } }),
  ]);
  const enabledBy = new Map(enabled.map((row) => [row.agentId, row._count._all]));
  const chatsBy = new Map(chats.map((row) => [row.agentId, row._count._all]));
  const departments = Array.from(new Set(agents.map((a) => a.department)));
  const shown = dept && departments.includes(dept) ? agents.filter((a) => a.department === dept) : agents;

  return (
    <main className="page">
      <AdminKicker kicker="Agents" readOnly={readOnly} />
      <h1>The 55 agents</h1>
      <p className="muted">
        Edits change the name, role and description every customer sees. The set of agents comes from the product, so agents are not added or removed here.
      </p>
      <form className="adm-toolbar" action="/sup-admin/agents" method="get">
        <select name="dept" defaultValue={dept || ""} aria-label="Team">
          <option value="">All teams ({agents.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button className="btn btn-g btn-sm" type="submit">
          Filter
        </button>
      </form>
      {agents.length === 0 ? <p className="banner">No agents in the database yet. They are added the first time a customer opens their team.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th className="adm-hide-sm">Team</th>
              <th>On for</th>
              <th className="adm-hide-sm">Chats</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((agent) => (
              <tr key={agent.id}>
                <td>
                  <b style={{ color: agent.color }}>●</b> <b>{agent.name}</b>
                  <div className="muted">{agent.role}</div>
                  <div className="muted" style={{ maxWidth: 420 }}>
                    {agent.blurb}
                  </div>
                </td>
                <td className="adm-hide-sm">{agent.department}</td>
                <td>{enabledBy.get(agent.id) || 0}</td>
                <td className="adm-hide-sm">{chatsBy.get(agent.id) || 0}</td>
                <td>
                  <AgentEditor agent={{ id: agent.id, name: agent.name, role: agent.role, blurb: agent.blurb, color: agent.color }} readOnly={readOnly} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
