import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { ACCESS_LABEL, accessOf } from "@/lib/admin/customers";
import { money } from "@/lib/admin/format";
import { confirmedSaleWhere, isInternalEmail, isMetricCustomer, PENDING_WINDOW_MS } from "@/lib/admin/metrics";
import { formatIst } from "@/lib/config";
import { istDayStart } from "@/lib/ist";
import { sourceFromStored } from "@/lib/marketing/touch";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LEGACY_TABS = new Set(["alerts", "followups"]);

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const { tab, q } = await searchParams;
  if (tab && LEGACY_TABS.has(tab)) redirect(`/sup-admin/ops?tab=${tab}`);
  if (q) redirect(`/sup-admin/customers?q=${encodeURIComponent(q)}`);

  const now = new Date();
  const today = istDayStart(now);
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const pendingSince = new Date(now.getTime() - PENDING_WINDOW_MS);
  const confirmed = confirmedSaleWhere();

  const [users, paidRows, refundRows, pendingRows, recentPayments, recentAudit] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        compAccess: true,
        suspendedAt: true,
        createdAt: true,
        payments: { where: confirmed, select: { id: true } },
      },
    }),
    prisma.payment.findMany({
      where: confirmed,
      select: { amountInr: true, paidAt: true, createdAt: true, email: true, userId: true },
    }),
    prisma.payment.findMany({
      where: { status: "refunded", isTest: false },
      select: { amountInr: true, email: true },
    }),
    prisma.payment.findMany({
      where: { status: "pending", isTest: false },
      select: { id: true, createdAt: true, email: true },
    }),
    prisma.payment.findMany({
      where: { isTest: false },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { id: true, email: true, name: true, businessName: true } } },
    }),
    prisma.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const customers = users.filter((user) => isMetricCustomer(user.email));
  const totalCustomers = customers.length;
  const paidCustomers = customers.filter((user) => !user.suspendedAt && user.payments.length > 0).length;
  const compCustomers = customers.filter((user) => !user.suspendedAt && user.compAccess).length;
  const suspended = users.filter((user) => user.suspendedAt).length;
  const signups7 = customers.filter((user) => user.createdAt >= d7).length;
  const liveRevenue = paidRows.filter((row) => !isInternalEmail(row.email));
  const instant = (row: { paidAt: Date | null; createdAt: Date }) => row.paidAt || row.createdAt;
  const sum = (rows: typeof liveRevenue) => rows.reduce((n, row) => n + row.amountInr, 0);
  const revenueAll = sum(liveRevenue);
  const revenue30 = sum(liveRevenue.filter((row) => instant(row) >= d30));
  const revenueToday = sum(liveRevenue.filter((row) => instant(row) >= today));
  const refunded = refundRows.filter((row) => !isInternalEmail(row.email)).reduce((n, row) => n + row.amountInr, 0);
  const realPending = pendingRows.filter((row) => !isInternalEmail(row.email));
  const pending48 = realPending.filter((row) => row.createdAt >= pendingSince).length;
  const abandoned = realPending.filter((row) => row.createdAt < pendingSince).length;
  const recentUsers = customers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8);

  return (
    <main className="page">
      <AdminKicker kicker="Overview" readOnly={readOnly} />
      <div className="adm-head">
        <h1>Run the business</h1>
        {readOnly ? null : (
          <div className="row-actions">
            <Link className="btn btn-p btn-sm" href="/sup-admin/customers/new">
              + New customer
            </Link>
            <Link className="btn btn-g btn-sm" href="/sup-admin/payments/new">
              + Record payment
            </Link>
          </div>
        )}
      </div>
      <p className="muted">Revenue and paid counts include only Cashfree-confirmed, non-test orders. Staff and test accounts are left out.</p>
      <div className="stats">
        <div className="stat">
          <small>Customers</small>
          <b>{totalCustomers}</b>
        </div>
        <div className="stat y">
          <small>Paid (active)</small>
          <b>{paidCustomers}</b>
        </div>
        <div className="stat">
          <small>Free access</small>
          <b>{compCustomers}</b>
        </div>
        <div className="stat">
          <small>Suspended</small>
          <b>{suspended}</b>
        </div>
        <div className="stat">
          <small>New in 7 days</small>
          <b>{signups7}</b>
        </div>
        <div className="stat y">
          <small>Revenue, all time</small>
          <b>{money(revenueAll)}</b>
        </div>
        <div className="stat">
          <small>Revenue, 30 days</small>
          <b>{money(revenue30)}</b>
        </div>
        <div className="stat">
          <small>Revenue, today (IST)</small>
          <b>{money(revenueToday)}</b>
        </div>
        <div className="stat">
          <small>Refunded</small>
          <b>{money(refunded)}</b>
        </div>
        <div className="stat">
          <small>Pending (48h)</small>
          <b>{pending48}</b>
        </div>
        <div className="stat">
          <small>Abandoned checkouts</small>
          <b>{abandoned}</b>
        </div>
      </div>

      <div className="adm-cols">
        <section className="adm-section">
          <div className="adm-head">
            <h2>Recent payments</h2>
            <Link href="/sup-admin/payments">All payments →</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No payments yet.</td>
                  </tr>
                ) : (
                  recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <Link href={`/sup-admin/payments/${encodeURIComponent(payment.id)}`}>{formatIst(payment.paidAt || payment.createdAt)}</Link>
                      </td>
                      <td>{payment.user?.email || payment.email || "—"}</td>
                      <td>{money(payment.amountInr)}</td>
                      <td>
                        <span className={`pill ${payment.status}`}>{payment.status}</span>
                        {payment.isTest ? <span className="test-badge">TEST</span> : null}
                      </td>
                      <td className="muted">{sourceFromStored(payment.mktLast || payment.mktFirst, payment.channelLast || payment.channelFirst)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="adm-section">
          <div className="adm-head">
            <h2>Recent signups</h2>
            <Link href="/sup-admin/customers">All customers →</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No customers yet.</td>
                  </tr>
                ) : (
                  recentUsers.map((user) => {
                    const kind = accessOf({ suspendedAt: user.suspendedAt, compAccess: user.compAccess, paidCount: user.payments.length });
                    return (
                      <tr key={user.id}>
                        <td>
                          <Link href={`/sup-admin/customers/${user.id}`}>
                            <b>{user.name || user.businessName || user.email || "Unnamed"}</b>
                          </Link>
                          <div className="muted">{formatIst(user.createdAt)}</div>
                        </td>
                        <td>
                          <span className={`pill ${kind}`}>{ACCESS_LABEL[kind]}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="adm-section">
        <div className="adm-head">
          <h2>Latest admin actions</h2>
          <Link href="/sup-admin/audit">Audit log →</Link>
        </div>
        {recentAudit.length === 0 ? (
          <p className="muted">Nothing yet. Every change made in this console is recorded here.</p>
        ) : (
          <ul>
            {recentAudit.map((row) => (
              <li key={row.id}>
                <span className="muted">{formatIst(row.createdAt)}</span> · {row.summary} <span className="muted">by {row.actorEmail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
