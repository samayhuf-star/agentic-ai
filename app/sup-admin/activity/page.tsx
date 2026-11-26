import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { money, pageParam, qs } from "@/lib/admin/format";
import { EVENT_LABEL, EVENT_TYPES } from "@/lib/activity/log";
import { formatIst } from "@/lib/config";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

function customerHref(row: { userId: string | null; paymentId: string | null }) {
  if (row.userId) return `/sup-admin/customers/${row.userId}`;
  if (row.paymentId) return `/sup-admin/payments/${encodeURIComponent(row.paymentId)}`;
  return null;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; source?: string; from?: string; to?: string; tag?: string; page?: string }>;
}) {
  const { readOnly } = await requireAdminPage();
  const params = await searchParams;
  const type = EVENT_TYPES.includes(params.type as (typeof EVENT_TYPES)[number]) ? params.type! : "";
  const query = (params.q || "").trim().slice(0, 100);
  const source = (params.source || "").trim().slice(0, 80);
  const tag = params.tag === "admin" || params.tag === "test" || params.tag === "live" ? params.tag : "";
  const fromDay = params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : "";
  const toDay = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : "";
  const page = pageParam(params.page);

  const filters: Prisma.SystemEventWhereInput[] = [];
  if (type) filters.push({ type });
  if (source) filters.push({ source: { contains: source, mode: "insensitive" } });
  if (tag === "live") filters.push({ tag: null });
  else if (tag) filters.push({ tag });
  if (fromDay) filters.push({ createdAt: { gte: new Date(`${fromDay}T00:00:00+05:30`) } });
  if (toDay) filters.push({ createdAt: { lt: new Date(new Date(`${toDay}T00:00:00+05:30`).getTime() + 864e5) } });
  if (query) {
    const digits = query.replace(/\D/g, "");
    filters.push({
      OR: [
        { summary: { contains: query, mode: "insensitive" } },
        { detail: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { paymentId: { contains: query, mode: "insensitive" } },
        { status: { contains: query, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ],
    });
  }
  const where: Prisma.SystemEventWhereInput = filters.length ? { AND: filters } : {};

  const [total, rows] = await Promise.all([
    prisma.systemEvent.count({ where }),
    prisma.systemEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const base = {
    type: type || undefined,
    q: query || undefined,
    source: source || undefined,
    tag: tag || undefined,
    from: fromDay || undefined,
    to: toDay || undefined,
  };

  return (
    <main className="page">
      <AdminKicker kicker="System" readOnly={readOnly} />
      <div className="adm-head">
        <h1>Activity</h1>
      </div>
      <p className="muted">Every visit, signup, checkout, Cashfree attempt, webhook, email and admin action, newest first. Admin and test rows are tagged, not hidden.</p>
      <form className="adm-toolbar act-filters" action="/sup-admin/activity" method="get">
        <input name="q" defaultValue={query} placeholder="Search email, phone, order, text" aria-label="Search activity" className="grow" />
        <select name="type" defaultValue={type} aria-label="Event type">
          <option value="">All types</option>
          {EVENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {EVENT_LABEL[value] || value}
            </option>
          ))}
        </select>
        <input name="source" defaultValue={source} placeholder="Source" aria-label="Source" />
        <select name="tag" defaultValue={tag} aria-label="Tag">
          <option value="">Everyone</option>
          <option value="live">Customers only</option>
          <option value="admin">Admin</option>
          <option value="test">Test</option>
        </select>
        <label>
          From <input type="date" name="from" defaultValue={fromDay} />
        </label>
        <label>
          To <input type="date" name="to" defaultValue={toDay} />
        </label>
        <button className="btn btn-g btn-sm" type="submit">
          Filter
        </button>
      </form>
      <p className="muted">
        {total} event{total === 1 ? "" : "s"}
        {query || type || source || tag || fromDay || toDay ? " match" : ""}.
      </p>
      <div className="table-wrap">
        <table className="act-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Customer</th>
              <th className="adm-hide-sm">Source</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>No events match.</td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = customerHref(row);
                const who = row.email || (row.phone ? displayPhone(row.phone) : null) || row.paymentId || "—";
                return (
                  <tr key={row.id}>
                    <td data-label="When">{formatIst(row.createdAt)}</td>
                    <td data-label="Type">
                      <span className="pill">{EVENT_LABEL[row.type] || row.type}</span>
                      {row.tag ? <span className={`test-badge${row.tag === "admin" ? " act-admin" : ""}`}>{row.tag}</span> : null}
                    </td>
                    <td data-label="Customer">{href ? <Link href={href}>{who}</Link> : who}</td>
                    <td className="adm-hide-sm muted" data-label="Source">
                      {row.source || "—"}
                    </td>
                    <td data-label="Amount">{row.amountInr != null ? money(row.amountInr) : "—"}</td>
                    <td data-label="Status">
                      <span className={`pill ${String(row.status || "").toLowerCase()}`}>{row.status || "—"}</span>
                    </td>
                    <td data-label="Details">
                      {row.summary}
                      {row.detail ? <div className="muted">{row.detail}</div> : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="adm-pager">
        {page > 1 ? <Link href={`/sup-admin/activity${qs(base, { page: page - 1 })}`}>← Previous</Link> : null}
        <span className="muted">
          Page {Math.min(page, pages)} of {pages}
        </span>
        {page < pages ? <Link href={`/sup-admin/activity${qs(base, { page: page + 1 })}`}>Next →</Link> : null}
      </div>
    </main>
  );
}
