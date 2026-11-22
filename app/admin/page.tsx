import Link from "next/link";
import { redirect } from "next/navigation";
import { GatewaySwitch, ResendButton } from "@/components/AdminPanel";
import { formatInr } from "@/lib/config";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getActiveGateway } from "@/lib/settings";
import { displayPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");
  const { q } = await searchParams;
  const query = (q || "").trim();
  const [signups, paidCount, revenue, gateway, users, payments] = await Promise.all([
    prisma.user.count(),
    prisma.payment.count({ where: { status: "paid" } }),
    prisma.payment.aggregate({ where: { status: "paid" }, _sum: { amountInr: true } }),
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
      include: { payments: { where: { status: "paid" }, select: { amountInr: true } } },
    }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: true } }),
  ]);

  return (
    <main className="page">
      <p className="br-kicker">Admin</p>
      <h1>Boardroom</h1>
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
      <form className="row-actions" action="/admin" method="get" style={{ margin: "18px 0" }}>
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
              <th>Paid</th>
              <th>Welcome</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3}>No one matches.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <b>{user.businessName || "No business name yet"}</b>
                    <div className="muted">{displayPhone(user.phone)}</div>
                    <div className="muted">{user.email || "Email not added"}</div>
                  </td>
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
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td>{payment.gateway}</td>
                <td>{formatInr(payment.amountInr)}</td>
                <td>{payment.status}</td>
                <td>{payment.phone ? displayPhone(payment.phone) : payment.user ? displayPhone(payment.user.phone) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 18 }}>
        <Link href="/dashboard">Back to the dashboard</Link>
      </p>
    </main>
  );
}
