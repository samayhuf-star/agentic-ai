import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { ACCESS_LABEL, accessOf, accessWhere } from "@/lib/admin/customers";
import { money, pageParam, qs } from "@/lib/admin/format";
import { formatIst } from "@/lib/config";
import { displayPhone } from "@/lib/phone";
import { sourceFromStored } from "@/lib/marketing/touch";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;
const FILTERS: [string, string][] = [
  ["", "All"],
  ["paid", "Paid"],
  ["comp", "Free access"],
  ["none", "No access"],
  ["suspended", "Suspended"],
];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; access?: string; page?: string; sort?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 100);
  const access = FILTERS.some(([key]) => key === params.access) ? params.access || "" : "";
  const sort = params.sort === "old" ? "old" : "new";
  const page = pageParam(params.page);
  const digits = query.replace(/\D/g, "");

  const filters: Prisma.UserWhereInput[] = [];
  if (query) {
    filters.push({
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { businessName: { contains: query, mode: "insensitive" } },
        { id: query },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ],
    });
  }
  const accessFilter = accessWhere(access);
  if (accessFilter) filters.push(accessFilter);
  const where: Prisma.UserWhereInput = filters.length ? { AND: filters } : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: sort === "old" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        payments: { where: { status: "paid", isTest: false, gateway: "cashfree", gatewayConfirmedAt: { not: null } }, select: { amountInr: true } },
        _count: { select: { sessions: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const base = { q: query || undefined, access: access || undefined, sort: sort === "old" ? "old" : undefined };

  return (
    <main className="page">
      <AdminKicker kicker="Customers" readOnly={readOnly} />
      <div className="adm-head">
        <h1>Customers</h1>
        {readOnly ? null : (
          <Link className="btn btn-p btn-sm" href="/sup-admin/customers/new">
            + New customer
          </Link>
        )}
      </div>
      <form className="adm-toolbar" action="/sup-admin/customers" method="get">
        <input name="q" defaultValue={query} placeholder="Search name, email, mobile, business or ID" aria-label="Search customers" className="grow" />
        <select name="access" defaultValue={access} aria-label="Access">
          {FILTERS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort">
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
        </select>
        <button className="btn btn-g btn-sm" type="submit">
          Filter
        </button>
      </form>
      <p className="muted">
        {total} customer{total === 1 ? "" : "s"}
        {query || access ? " match" : ""}.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Access</th>
              <th>Source</th>
              <th>Paid</th>
              <th className="adm-hide-sm">Mobile</th>
              <th className="adm-hide-sm">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5}>No customers match.</td>
              </tr>
            ) : (
              users.map((user) => {
                const kind = accessOf({ suspendedAt: user.suspendedAt, compAccess: user.compAccess, paidCount: user.payments.length });
                const real = user.payments.reduce((sum, p) => sum + p.amountInr, 0);
                return (
                  <tr key={user.id}>
                    <td>
                      <Link href={`/sup-admin/customers/${user.id}`}>
                        <b>{user.name || user.businessName || "Unnamed"}</b>
                      </Link>
                      <div className="muted">{user.email || "No email yet"}</div>
                      {user.name && user.businessName ? <div className="muted">{user.businessName}</div> : null}
                    </td>
                    <td>
                      <span className={`pill ${kind}`}>{ACCESS_LABEL[kind]}</span>
                    </td>
                    <td className="muted">{sourceFromStored(user.mktLast || user.mktFirst, user.channelLast || user.channelFirst)}</td>
                    <td>{money(real)}</td>
                    <td className="adm-hide-sm">{user.phone ? displayPhone(user.phone) : "—"}</td>
                    <td className="adm-hide-sm">{formatIst(user.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="adm-pager">
        {page > 1 ? <Link href={`/sup-admin/customers${qs(base, { page: page - 1 })}`}>← Previous</Link> : null}
        <span className="muted">
          Page {Math.min(page, pages)} of {pages}
        </span>
        {page < pages ? <Link href={`/sup-admin/customers${qs(base, { page: page + 1 })}`}>Next →</Link> : null}
      </div>
    </main>
  );
}
