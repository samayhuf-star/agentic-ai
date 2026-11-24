import Link from "next/link";
import { GatewaySwitch, ResendButton, TestEmailForm } from "@/components/AdminPanel";
import { formatInr, formatIst } from "@/lib/config";
import { requireAdminPage } from "@/lib/admin/guard";
import { prisma } from "@/lib/prisma";
import { getActiveGateway } from "@/lib/settings";
import { FulfilButton } from "@/components/FulfilButton";
import { MarkTestToggle } from "@/components/MarkTestToggle";
import { displayPhone } from "@/lib/phone";
import { TestAlertButton } from "@/components/TestAlertButton";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const session = await requireAdminPage();
  const { q, tab } = await searchParams;
  const query = (q || "").trim();
  const [alerts, followups, leads] = await Promise.all([
    prisma.alertLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.followupSend.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.lead.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const [signups, paidCount, revenue, gateway, users, payments] = await Promise.all([
    prisma.user.count({
      where: {
        OR: [{ payments: { none: { status: "paid" } } }, { payments: { some: { status: "paid", isTest: false } } }],
      },
    }),
    prisma.payment.count({ where: { status: "paid", isTest: false } }),
    prisma.payment.aggregate({ where: { status: "paid", isTest: false }, _sum: { amountInr: true } }),
    getActiveGateway(),
    prisma.user.findMany({
      where: query
        ? {
            OR: [
              { phone: { contains: query } },
              { email: { contains: query, mode: "insensitive" } },
              { businessName: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { payments: { where: { status: "paid", isTest: false }, select: { amountInr: true } } },
    }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: true } }),
  ]);

  return (
    <main className="page">
      <p className="br-kicker">Admin</p>
      <h1>AI Time Machine</h1>
      <p className="row-actions">
        <Link href="/sup-admin">Home</Link>
        <Link href="/sup-admin/stats">Sales</Link>
        <Link href="/sup-admin/stats/orders">Orders</Link>
        <Link href="/sup-admin/stats/customers">Customers</Link>
        <Link href="/sup-admin/stats/funnel">Funnel</Link>
        <Link href="/sup-admin?tab=alerts">Alerts</Link>
        <Link href="/sup-admin?tab=followups">Follow-ups</Link>
      </p>
      {tab === "alerts" ? (
        <section>
          <h2 style={{ fontSize: 28 }}>Alerts</h2>
          <TestAlertButton />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No alerts yet.</td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>{formatIst(alert.createdAt)}</td>
                      <td>{alert.kind}</td>
                      <td>{alert.channel}</td>
                      <td>{alert.status}</td>
                      <td>{alert.toAddress}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {tab === "followups" ? (
        <section>
          <h2 style={{ fontSize: 28 }}>Follow-ups</h2>
          <h3>Waiting on payment</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No open checkouts.</td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>{formatIst(lead.createdAt)}</td>
                      <td>{lead.email || "—"}</td>
                      <td>{lead.phone ? displayPhone(lead.phone) : "—"}</td>
                      <td>{lead.orderId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <h3>Sent</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Step</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {followups.length === 0 ? (
                  <tr>
                    <td colSpan={3}>None sent yet.</td>
                  </tr>
                ) : (
                  followups.map((row) => (
                    <tr key={row.id}>
                      <td>{formatIst(row.createdAt)}</td>
                      <td>{row.step}</td>
                      <td>{row.toEmail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {tab ? null : (
      <>
      <div className="stats">
        <div className="stat">
          <small>Signups</small>
          <b>{signups}</b>
        </div>
        <div className="stat">
          <small>Paid</small>
          <b>{paidCount}</b>
        </div>
        <div className="stat">
          <small>Revenue</small>
          <b>{formatInr(revenue._sum.amountInr || 0)}</b>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 24 }}>Active gateway</h2>
        <p className="muted">New Buy buttons use this. Cashfree is the main one. Razorpay and PayU are backups.</p>
        <GatewaySwitch current={gateway} />
      </div>
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 24 }}>Test email</h2>
        <p className="muted">Sends from the configured sender. Replies go to support@theaitimemachine.com.</p>
        <TestEmailForm defaultTo={session.email} />
      </div>
      <form className="row-actions" action="/sup-admin" method="get" style={{ margin: "18px 0" }}>
        <input name="q" defaultValue={query} placeholder="Search phone, email or business" aria-label="Search people" style={{ maxWidth: 360 }} />
        <button className="btn btn-p" type="submit">
          Search
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Signed up</th>
              <th>Paid</th>
              <th>Welcome</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4}>No one matches.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <b>{user.businessName || "No business name yet"}</b>
                    <div className="muted">{displayPhone(user.phone)}</div>
                    <div className="muted">{user.email || "Email not added"}</div>
                  </td>
                  <td>{formatIst(user.createdAt)}</td>
                  <td>{formatInr(user.payments.reduce((sum, payment) => sum + payment.amountInr, 0))}</td>
                  <td>{user.email ? <ResendButton userId={user.id} /> : <span className="muted">Waiting for email</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <h2 style={{ marginTop: 28, fontSize: 28 }}>Payments</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Gateway</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{formatIst(payment.createdAt)}</td>
                <td>{payment.gateway}</td>
                <td>{formatInr(payment.amountInr)}</td>
                <td>
                  {payment.status}
                  {payment.isTest ? <span className="test-badge">TEST</span> : null}
                </td>
                <td>{payment.phone ? displayPhone(payment.phone) : payment.user?.phone ? displayPhone(payment.user.phone) : "—"}</td>
                <td>{payment.email || payment.user?.email || "—"}</td>
                <td>
                  <div className="muted">{payment.id}</div>
                  <MarkTestToggle orderId={payment.id} isTest={payment.isTest} />
                  {payment.isTest ? (
                    <p className="muted">Test payments are not fulfilled.</p>
                  ) : (
                    <FulfilButton orderId={payment.id} email={payment.email || payment.user?.email || ""} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 18 }}>
        <Link href="/dashboard">Back to the dashboard</Link>
      </p>
      </>
      )}
    </main>
  );
}
