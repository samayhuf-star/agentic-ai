import Link from "next/link";
import { MarkRefunded } from "@/components/admin/MarkRefunded";
import { StatsBar } from "@/components/admin/StatsBar";
import { requireAdminPage } from "@/lib/admin/guard";
import { readStatsRange, rangeQuery } from "@/lib/admin/range";
import { orderRows } from "@/lib/admin/stats";
import { formatInr, formatIst } from "@/lib/config";

export const dynamic = "force-dynamic";

const statuses = ["all", "pending", "paid", "failed", "refunded"];

export default async function OrdersStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tests?: string; status?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const range = readStatsRange(params);
  const status = statuses.includes(params.status || "") ? params.status || "all" : "all";
  const { rows, total } = await orderRows(range, status);
  const csv = `/api/admin/stats/orders.csv?${rangeQuery(range, { status })}`;
  return (
    <main className="page stats-page">
      <p className="br-kicker">Orders</p>
      <h1>Orders</h1>
      <StatsBar range={range} path="/sup-admin/stats/orders" status={status} />
      <p className="row-actions chip-row">
        {statuses.map((item) => (
          <Link key={item} href={`/sup-admin/stats/orders?${rangeQuery(range, { status: item })}`} className={status === item ? "on" : ""}>
            {item}
          </Link>
        ))}
        <a href={csv}>Download CSV</a>
      </p>
      {rows.length === 0 ? <p className="banner">No data yet.</p> : null}
      <ul className="order-cards">
        {rows.map((row) => (
          <li className="order-card" key={row.id}>
            <b>{formatInr(row.amountInr)}</b>
            <span>{row.status}</span>
            <span>{formatIst(row.shownAt)}</span>
            <span>{row.email || "No email"}</span>
            {row.isTest ? <span className="test-badge">TEST</span> : <span className="muted">Live</span>}
            <span className="muted">
              {row.id} · {row.gateway}
            </span>
            {row.refundedAt ? (
              <span className="muted">
                Refunded {formatIst(row.refundedAt)} by {row.refundedBy || "—"}
              </span>
            ) : (
              <MarkRefunded orderId={row.id} status={row.status} />
            )}
          </li>
        ))}
      </ul>
      <div className="table-wrap orders-table">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Order</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Refund</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatIst(row.shownAt)}</td>
                <td>
                  {row.id}
                  <div className="muted">{row.gateway}{row.isTest ? " · test" : " · live"}</div>
                </td>
                <td>{row.email || "—"}</td>
                <td>{formatInr(row.amountInr)}</td>
                <td>{row.status}</td>
                <td>
                  {row.refundedAt ? (
                    <span className="muted">
                      {formatIst(row.refundedAt)}
                      <br />
                      {row.refundedBy || "—"}
                    </span>
                  ) : (
                    <MarkRefunded orderId={row.id} status={row.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Showing {rows.length} of {total}. The newest 100 in this filter.
      </p>
    </main>
  );
}
