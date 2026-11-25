import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { pageParam, qs } from "@/lib/admin/format";
import { formatIst } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const ENTITIES = ["", "customer", "payment", "agent", "affiliate"];

function entityHref(entity: string, id: string | null) {
  if (!id) return null;
  if (entity === "customer") return `/sup-admin/customers/${id}`;
  if (entity === "payment") return `/sup-admin/payments/${encodeURIComponent(id)}`;
  if (entity === "affiliate") return `/sup-admin/affiliates/${id}`;
  if (entity === "agent") return "/sup-admin/agents";
  return null;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; q?: string; page?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const params = await searchParams;
  const entity = ENTITIES.includes(params.entity || "") ? params.entity || "" : "";
  const query = (params.q || "").trim().slice(0, 100);
  const page = pageParam(params.page);
  const filters: Prisma.AdminAuditWhereInput[] = [];
  if (entity) filters.push({ entity });
  if (query) filters.push({ OR: [{ summary: { contains: query, mode: "insensitive" } }, { actorEmail: { contains: query, mode: "insensitive" } }, { entityId: query }] });
  const where = filters.length ? { AND: filters } : {};
  const [total, rows] = await Promise.all([
    prisma.adminAudit.count({ where }),
    prisma.adminAudit.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const base = { entity: entity || undefined, q: query || undefined };
  return (
    <main className="page">
      <AdminKicker kicker="Audit log" readOnly={readOnly} />
      <h1>Audit log</h1>
      <p className="muted">Every create, edit, suspend and delete made in this console, with who did it. Older gateway actions (refunds, fulfilment) keep their own fields on the payment.</p>
      <form className="adm-toolbar" action="/sup-admin/audit" method="get">
        <input name="q" defaultValue={query} placeholder="Search text, admin email or ID" aria-label="Search audit" className="grow" />
        <select name="entity" defaultValue={entity} aria-label="Type">
          {ENTITIES.map((value) => (
            <option key={value} value={value}>
              {value || "Everything"}
            </option>
          ))}
        </select>
        <button className="btn btn-g btn-sm" type="submit">
          Filter
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>What</th>
              <th className="adm-hide-sm">Who</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3}>Nothing recorded yet.</td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = entityHref(row.entity, row.entityId);
                return (
                  <tr key={row.id}>
                    <td>{formatIst(row.createdAt)}</td>
                    <td>
                      <span className="pill">{row.action}</span> {href && !row.action.endsWith(".delete") ? <Link href={href}>{row.summary}</Link> : row.summary}
                    </td>
                    <td className="adm-hide-sm muted">{row.actorEmail}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="adm-pager">
        {page > 1 ? <Link href={`/sup-admin/audit${qs(base, { page: page - 1 })}`}>← Previous</Link> : null}
        <span className="muted">
          Page {Math.min(page, pages)} of {pages}
        </span>
        {page < pages ? <Link href={`/sup-admin/audit${qs(base, { page: page + 1 })}`}>Next →</Link> : null}
      </div>
    </main>
  );
}
