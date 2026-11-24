import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { StatsBar } from "@/components/admin/StatsBar";
import { requireAdminPage } from "@/lib/admin/guard";
import { readStatsRange, rangeQuery } from "@/lib/admin/range";
import { salesSnapshot } from "@/lib/admin/stats";
import { formatInr, formatIst } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SalesStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tests?: string }>;
}) {
  const { readOnly } = await requireAdminPage();
  const range = readStatsRange(await searchParams);
  const sales = await salesSnapshot(range);
  const empty = sales.rangeOrders === 0 && sales.pendingCount === 0 && sales.failedCount === 0 && sales.rangeRefunded === 0;
  return (
    <main className="page stats-page">
      <AdminKicker kicker="Sales" readOnly={readOnly} />
      <h1>Real sales</h1>
      <p className="muted">These numbers come from the database. Test orders stay out unless you include them. Nothing on this page is a sample.</p>
      <StatsBar range={range} path="/sup-admin/stats" />
      <div className="stats">
        {sales.windows.map((window) => (
          <div className="stat" key={window.label}>
            <small>{window.label}</small>
            <b>Net {formatInr(window.net)}</b>
            <span className="muted">
              {window.orders} paid · {formatInr(window.refunded)} refunded
            </span>
          </div>
        ))}
      </div>
      {empty ? <p className="banner">No data yet.</p> : null}
      <div className="stats">
        <div className="stat">
          <small>Gross paid in this range</small>
          <b>{formatInr(sales.rangePaid)}</b>
        </div>
        <div className="stat">
          <small>Orders</small>
          <b>{sales.rangeOrders}</b>
        </div>
        <div className="stat">
          <small>Average order</small>
          <b>{sales.rangeOrders ? formatInr(sales.aov) : "—"}</b>
        </div>
        <div className="stat">
          <small>Refunded</small>
          <b>{formatInr(sales.rangeRefunded)}</b>
        </div>
        <div className="stat">
          <small>Net</small>
          <b>{formatInr(sales.rangeNet)}</b>
        </div>
        <div className="stat y">
          <small>Failed</small>
          <b>{sales.failedCount}</b>
        </div>
      </div>
      <h2>Daily revenue</h2>
      <p className="muted">Bars are gross paid, including orders later marked refunded, on the India day they were paid. The same count is the “paid” number on the cards. Refunds stay in the Net figures and are not taken out of the bars.</p>
      <RevenueChart days={sales.days} />
      <h2>Pending payments</h2>
      {sales.pending.length === 0 ? (
        <p className="muted">No data yet.</p>
      ) : (
        <>
        <ul className="order-cards">
          {sales.pending.map((row) => (
            <li className="order-card" key={row.id}>
              <b>{formatInr(row.amountInr)}</b>
              <span>Pending · {row.age}</span>
              <span>{formatIst(row.createdAt)}</span>
              <span>{row.email || "No email"}</span>
              <span className="muted">{row.id}</span>
            </li>
          ))}
        </ul>
        <div className="table-wrap orders-table">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Age</th>
                <th>Amount</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {sales.pending.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.age}</td>
                  <td>{formatInr(row.amountInr)}</td>
                  <td>{row.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      <p className="muted">As of {formatIst(range.to)}. {range.includeTest ? "Test orders are included." : "Live orders only."}</p>
      <p>
        <Link href={`/sup-admin/stats/orders?${rangeQuery(range)}`}>Open the orders table</Link>
      </p>
    </main>
  );
}
