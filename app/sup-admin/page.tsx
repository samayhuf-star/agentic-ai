import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { ACCESS_LABEL, accessOf } from "@/lib/admin/customers";
import { money } from "@/lib/admin/format";
import { formatIst, privilegedEmails } from "@/lib/config";
import { istDayStart } from "@/lib/ist";
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
  const notStaff = { OR: [{ email: null }, { email: { notIn: privilegedEmails() } }] };
  const realPaid = { status: "paid", isTest: false };

  const [
    totalCustomers,
    paidCustomers,
    compCustomers,
    suspended,
    signups7,
    revenueAll,
    revenue30,
    revenueToday,
    refunded,
    pending,
    recentUsers,
    recentPayments,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count({ where: notStaff }),
    prisma.user.count({ where: { ...notStaff, suspendedAt: null, payments: { some: realPaid } } }),
    prisma.user.count({ where: { ...notStaff, suspendedAt: null, compAccess: true } }),
    prisma.user.count({ where: { NOT: { suspendedAt: null } } }),
    prisma.user.count({ where: { ...notStaff, createdAt: { gte: d7 } } }),
    prisma.payment.aggregate({ where: realPaid, _sum: { amountInr: true }, _count: true }),
    prisma.payment.aggregate({ where: { ...realPaid, paidAt: { gte: d30 } }, _sum: { amountInr: true }, _count: true }),
    prisma.payment.aggregate({ where: { ...realPaid, paidAt: { gte: today } }, _sum: { amountInr: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: "refunded", isTest: false }, _sum: { amountInr: true }, _count: true }),
    prisma.payment.count({ where: { status: "pending", isTest: false } }),
    prisma.user.findMany({
      where: notStaff,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { payments: { where: { status: "paid" } } } } },
    }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { id: true, email: true, name: true, businessName: true } } } }),
    prisma.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

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
      <p className="muted">Revenue counts real paid payments only. Test payments, admin and staff accounts are left out.</p>
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
          <b>{money(revenueAll._sum.amountInr || 0)}</b>
        </div>
        <div className="stat">
          <small>Revenue, 30 days</small>
          <b>{money(revenue30._sum.amountInr || 0)}</b>
        </div>
        <div className="stat">
          <small>Revenue, today (IST)</small>
          <b>{money(revenueToday._sum.amountInr || 0)}</b>
        </div>
        <div className="stat">
          <small>Refunded</small>
          <b>{money(refunded._sum.amountInr || 0)}</b>
        </div>
        <div className="stat">
          <small>Pending payments</small>
          <b>{pending}</b>
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
                </tr>
              </thead>
              <tbody>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No payments yet.</td>
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
                    const kind = accessOf({ suspendedAt: user.suspendedAt, compAccess: user.compAccess, paidCount: user._count.payments });
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
