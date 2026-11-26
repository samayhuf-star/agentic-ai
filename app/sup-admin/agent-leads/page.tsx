import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { AgentLeadAdminActions } from "@/components/agent-leads/AdminActions";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatIst } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import "../../creators/creators.css";

export const dynamic = "force-dynamic";

export default async function AgentLeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; test?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const { status = "new", q = "", test = "hide" } = await searchParams;
  const filter = ["new", "contacted", "archived", "all"].includes(status) ? status : "new";
  const query = q.trim().slice(0, 80);
  const where = {
    ...(filter === "all" ? {} : { status: filter }),
    ...(test === "show" ? {} : { isTest: false }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { company: { contains: query, mode: "insensitive" as const } },
            { need: { contains: query, mode: "insensitive" as const } },
            { agentType: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, newCount, total, tests] = await Promise.all([
    prisma.agentLead.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.agentLead.count({ where: { status: "new", isTest: false } }),
    prisma.agentLead.count({ where: { isTest: false } }),
    prisma.agentLead.count({ where: { isTest: true } }),
  ]);
  return (
    <main className="page creator-admin">
      <AdminKicker kicker="AI agents leads" readOnly={readOnly} />
      <div className="adm-head">
        <h1>AI agents leads</h1>
        <div className="row-actions">
          <Link className="btn btn-g btn-sm" href="/ai-agents" target="_blank">
            Public pages ↗
          </Link>
          <a className="btn btn-g btn-sm" href="/api/admin/agent-leads.csv">
            Export CSV
          </a>
        </div>
      </div>
      <p className="muted">
        {total} real lead{total === 1 ? "" : "s"}
        {newCount ? `, ${newCount} new` : ""}
        {tests ? ` · ${tests} test lead${tests === 1 ? "" : "s"} hidden by default` : ""}. Leads come from the form at the bottom of every /ai-agents page.
      </p>
      <form className="adm-toolbar" method="get">
        <select name="status" defaultValue={filter}>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <select name="test" defaultValue={test === "show" ? "show" : "hide"}>
          <option value="hide">Hide test leads</option>
          <option value="show">Show test leads</option>
        </select>
        <input name="q" defaultValue={query} placeholder="Search name, email, company, need" />
        <button className="btn btn-g btn-sm" type="submit">
          Filter
        </button>
      </form>
      {rows.length === 0 ? <p className="muted">No leads in this view yet.</p> : null}
      <div className="adm-list">
        {rows.map((row) => (
          <article key={row.id} className="card" style={{ marginTop: 12, padding: 16 }}>
            <div className="adm-head" style={{ marginBottom: 8 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  {row.name}
                  {row.company ? ` · ${row.company}` : ""}
                  {row.isTest ? " · TEST" : ""}
                </h2>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  <a href={`mailto:${row.email}`}>{row.email}</a> · {formatIst(row.createdAt)} · {row.status}
                  {row.timeZone ? ` · ${row.timeZone}` : ""}
                  {row.country ? ` · ${row.country}` : ""}
                </p>
              </div>
              {readOnly ? null : <AgentLeadAdminActions id={row.id} isTest={row.isTest} status={row.status} />}
            </div>
            <p style={{ margin: "6px 0" }}>
              <b>{row.agentType}</b> ·{" "}
              <a href={row.pagePath} target="_blank" rel="noreferrer">
                {row.pagePath}
              </a>
            </p>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{row.need}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
