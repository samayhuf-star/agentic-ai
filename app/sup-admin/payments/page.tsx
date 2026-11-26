import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { money, pageParam, qs } from "@/lib/admin/format";
import { METHOD_LABEL } from "@/lib/admin/validate";
import { formatIst } from "@/lib/config";
import { confirmedSaleWhere } from "@/lib/admin/metrics";
import { sourceFromStored } from "@/lib/marketing/touch";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 30;
const STATUSES = ["", "paid", "pending", "failed", "refunded", "paid_unassigned"];
const GATEWAYS = ["", "manual", "cashfree", "razorpay", "payu", "mock"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; gateway?: string; tests?: string; page?: string }>;
}) {
  const { readOnly } = await requireAdminPage();
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 100);
  const status = STATUSES.includes(params.status || "") ? params.status || "" : "";
  const gateway = GATEWAYS.includes(params.gateway || "") ? params.gateway || "" : "";
  const tests = params.tests === "only" ? "only" : params.tests === "all" ? "all" : "hide";
  const page = pageParam(params.page);

  const filters: Prisma.PaymentWhereInput[] = [];
  if (query) {
    filters.push({
      OR: [
        { id: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { reference: { contains: query, mode: "insensitive" } },
        { gatewayPaymentId: { contains: query } },
        { user: { is: { email: { contains: query, mode: "insensitive" } } } },
      ],
    });
  }
  if (status) filters.push({ status });
  if (gateway) filters.push({ gateway });
  if (tests === "only") filters.push({ isTest: true });
  if (tests === "hide") filters.push({ isTest: false });
  const where: Prisma.PaymentWhereInput = filters.length ? { AND: filters } : {};

  const [total, sum, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { AND: [where, confirmedSaleWhere()] }, _sum: { amountInr: true } }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { id: true, email: true, name: true, businessName: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const base = { q: query || undefined, status: status || undefined, gateway: gateway || undefined, tests: tests !== "hide" ? tests : undefined };

  return (
    <main className="page">
      <AdminKicker kicker="Payments" readOnly={readOnly} />
      <div className="adm-head">
        <h1>Payments</h1>
        {readOnly ? null : (
          <Link className="btn btn-p btn-sm" href="/sup-admin/payments/new">
            + Record payment
          </Link>
        )}
      </div>
      <form className="adm-toolbar" action="/sup-admin/payments" method="get">
        <input name="q" defaultValue={query} placeholder="Search ID, email, name or reference" aria-label="Search payments" className="grow" />
        <select name="status" defaultValue={status} aria-label="Status">
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value || "Any status"}
            </option>
          ))}
        </select>
        <select name="gateway" defaultValue={gateway} aria-label="Source">
          {GATEWAYS.map((value) => (
            <option key={value} value={value}>
              {value || "Any source"}
            </option>
          ))}
        </select>
        <select name="tests" defaultValue={tests} aria-label="Test payments">
          <option value="hide">Hide tests</option>
          <option value="all">Tests included</option>
          <option value="only">Tests only</option>
        </select>
        <button className="btn btn-g btn-sm" type="submit">
          Filter
        </button>
      </form>
      <p className="muted">
        {total} payment{total === 1 ? "" : "s"} · Cashfree-confirmed in this view: <b style={{ color: "var(--text)" }}>{money(sum._sum.amountInr || 0)}</b>
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="adm-hide-sm">Source</th>
              <th className="adm-hide-sm">Gateway</th>
              <th className="adm-hide-sm">Reference</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6}>No payments match.</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/sup-admin/payments/${encodeURIComponent(p.id)}`}>{formatIst(p.paidAt || p.createdAt)}</Link>
                  </td>
                  <td>
                    {p.user ? <Link href={`/sup-admin/customers/${p.user.id}`}>{p.user.email || p.user.name || p.user.businessName || "Customer"}</Link> : p.email || p.name || <span className="muted">Not linked</span>}
                  </td>
                  <td>{money(p.amountInr)}</td>
                  <td>
                    <span className={`pill ${p.status}`}>{p.status}</span>
                    {p.isTest ? <span className="test-badge">TEST</span> : null}
                  </td>
                  <td className="adm-hide-sm">{sourceFromStored(p.mktLast || p.mktFirst, p.channelLast || p.channelFirst, { affiliate: Boolean(p.affiliateId) })}</td>
                  <td className="adm-hide-sm">
                    {p.gateway}
                    {p.method ? <span className="muted"> · {METHOD_LABEL[p.method] || p.method}</span> : null}
                  </td>
                  <td className="adm-hide-sm muted">{p.reference || p.gatewayPaymentId || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="adm-pager">
        {page > 1 ? <Link href={`/sup-admin/payments${qs(base, { page: page - 1 })}`}>← Previous</Link> : null}
        <span className="muted">
          Page {Math.min(page, pages)} of {pages}
        </span>
        {page < pages ? <Link href={`/sup-admin/payments${qs(base, { page: page + 1 })}`}>Next →</Link> : null}
      </div>
    </main>
  );
}
