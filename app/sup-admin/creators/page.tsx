import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { CreatorAdminActions } from "@/components/creators/AdminActions";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatIst } from "@/lib/config";
import { contentLabels, platformLabel, rateLabel, selectedAppNames, splitList } from "@/lib/creators/view";
import { prisma } from "@/lib/prisma";
import "../../creators/creators.css";

export const dynamic = "force-dynamic";

export default async function CreatorApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { readOnly } = await requireAdminPage();
  const { status = "new", q = "" } = await searchParams;
  const filter = ["new", "reviewed", "archived", "all"].includes(status) ? status : "new";
  const query = q.trim().slice(0, 80);
  const where = {
    ...(filter === "all" ? {} : { status: filter }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { selectedApps: { contains: query, mode: "insensitive" as const } },
            { niche: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, newCount, total] = await Promise.all([
    prisma.creatorApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.creatorApplication.count({ where: { status: "new" } }),
    prisma.creatorApplication.count(),
  ]);

  return (
    <main className="page creator-admin">
      <AdminKicker kicker="Creators" readOnly={readOnly} />
      <div className="adm-head">
        <h1>Creator applications</h1>
        <div className="row-actions">
          <Link className="btn btn-g btn-sm" href="/creators" target="_blank">
            Public apply page ↗
          </Link>
          <a className="btn btn-g btn-sm" href="/api/admin/creators.csv">
            Export CSV
          </a>
        </div>
      </div>
      <p className="muted">
        {total} application{total === 1 ? "" : "s"} in total{newCount ? `, ${newCount} new` : ""}. Public form: /creators. Creators never see this admin page.
      </p>
      <form className="adm-toolbar" method="get">
        <select name="status" defaultValue={filter}>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <input name="q" defaultValue={query} placeholder="Search name, email, niche" />
        <button className="btn btn-g btn-sm" type="submit">
          Filter
        </button>
      </form>
      {rows.length === 0 ? <p className="muted">No applications in this view yet.</p> : null}
      <div className="adm-list">
        {rows.map((row) => (
          <article key={row.id} className="card" style={{ marginTop: 12, padding: 16 }}>
            <div className="adm-head" style={{ marginBottom: 8 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  {row.name}
                  {row.isTest ? " · TEST" : ""}
                </h2>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {row.email}
                  {row.phone ? ` · ${row.phone}` : ""} · {row.country} · {formatIst(row.createdAt)} · {row.status}
                </p>
              </div>
              {readOnly ? null : <CreatorAdminActions id={row.id} isTest={row.isTest} status={row.status} />}
            </div>
            <div className="app-pills">
              {selectedAppNames(row.selectedApps).map((name) => (
                <span key={name} className="pill">
                  {name}
                </span>
              ))}
            </div>
            <p style={{ margin: "10px 0 0" }}>
              {platformLabel(row.platform)} · {row.followerRange} · {row.niche} · {row.languages}
              <br />
              {contentLabels(row.contentTypes).join(", ")}
              {row.rateType ? ` · ${rateLabel(row.rateType)}${row.rateNote ? ` (${row.rateNote})` : ""}` : ""}
            </p>
            <details>
              <summary>Profiles, samples and note</summary>
              <p>
                <b>Profiles</b>
                <br />
                {splitList(row.profileUrls, "\n").map((url) => (
                  <span key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {url}
                    </a>
                    <br />
                  </span>
                ))}
              </p>
              {splitList(row.sampleLinks, "\n").length ? (
                <p>
                  <b>Samples</b>
                  <br />
                  {splitList(row.sampleLinks, "\n").map((url) => (
                    <span key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {url}
                      </a>
                      <br />
                    </span>
                  ))}
                </p>
              ) : null}
              {row.note ? (
                <p>
                  <b>Note</b>
                  <br />
                  {row.note}
                </p>
              ) : null}
            </details>
          </article>
        ))}
      </div>
    </main>
  );
}
