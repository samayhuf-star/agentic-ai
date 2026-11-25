import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { money } from "@/lib/admin/format";
import { istRange, readDim, readTouch, salesBySource } from "@/lib/marketing/report";

export const dynamic = "force-dynamic";

const DIMS = [
  ["channel", "Channel"],
  ["source", "Source"],
  ["campaign", "Campaign"],
] as const;

export default async function SalesBySourcePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; dim?: string; touch?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const sp = await searchParams;
  const { from, to, fromDay, toDay } = istRange(sp.from, sp.to);
  const dim = readDim(sp.dim);
  const touch = readTouch(sp.touch);
  const rows = await salesBySource(from, to, dim, touch);
  const total = rows.reduce((t, r) => ({ sales: t.sales + r.sales, revenue: t.revenue + r.revenue, manual: t.manual + r.manualSales, manualRev: t.manualRev + r.manualRevenue, signups: t.signups + r.signups }), {
    sales: 0,
    revenue: 0,
    manual: 0,
    manualRev: 0,
    signups: 0,
  });
  const q = (extra: Record<string, string>) => `?${new URLSearchParams({ from: fromDay, to: toDay, dim, touch, ...extra })}`;
  const csv = `/api/admin/reports/sources${q({})}`;
  return (
    <main className="page">
      <AdminKicker kicker="Stats" readOnly={readOnly} />
      <h1>Sales by source</h1>
      <p className="muted">
        Sales count only when Cashfree confirmed the payment. Manual payments recorded by an admin are shown separately. Signups = people who started checkout. Dates are IST.
      </p>
      <form className="adm-toolbar">
        <label>
          From <input type="date" name="from" defaultValue={fromDay} />
        </label>
        <label>
          To <input type="date" name="to" defaultValue={toDay} />
        </label>
        <select name="dim" defaultValue={dim}>
          {DIMS.map(([k, l]) => (
            <option key={k} value={k}>
              By {l.toLowerCase()}
            </option>
          ))}
        </select>
        <select name="touch" defaultValue={touch}>
          <option value="last">Last touch</option>
          <option value="first">First touch</option>
        </select>
        <button className="btn btn-g btn-sm" type="submit">
          Apply
        </button>
        <span className="grow" />
        <a className="btn btn-g btn-sm" href={csv}>
          Export CSV
        </a>
        <a className="btn btn-g btn-sm" href={`/api/admin/reports/sources${q({ rows: "payments" })}`}>
          Export sales rows (with gclid)
        </a>
      </form>
      <div className="adm-subnav" style={{ marginBottom: 12 }}>
        {DIMS.map(([k, l]) => (
          <Link key={k} href={q({ dim: k })} className={dim === k ? "on" : ""}>
            {l}
          </Link>
        ))}
        <Link href={q({ touch: touch === "last" ? "first" : "last" })}>Switch to {touch === "last" ? "first" : "last"} touch</Link>
      </div>
      <div className="stats">
        <div className="stat">
          <small>Signups</small>
          <b>{total.signups}</b>
        </div>
        <div className="stat y">
          <small>Sales (Cashfree)</small>
          <b>{total.sales}</b>
        </div>
        <div className="stat y">
          <small>Revenue (Cashfree)</small>
          <b>{money(total.revenue)}</b>
        </div>
        <div className="stat">
          <small>Conversion</small>
          <b>{total.signups ? `${((total.sales / total.signups) * 100).toFixed(1)}%` : "—"}</b>
        </div>
        <div className="stat">
          <small>Manual sales</small>
          <b>{total.manual}</b>
          <span className="muted">{money(total.manualRev)}</span>
        </div>
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>{DIMS.find(([k]) => k === dim)![1]}</th>
              <th className="num">Signups</th>
              <th className="num">Sales</th>
              <th className="num">Revenue</th>
              <th className="num">Conversion</th>
              <th className="num">Manual sales</th>
              <th className="num">Manual revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nothing in this range.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}</td>
                  <td className="num">{r.signups}</td>
                  <td className="num">{r.sales}</td>
                  <td className="num">{money(r.revenue)}</td>
                  <td className="num">{r.signups ? `${((r.sales / r.signups) * 100).toFixed(1)}%` : "—"}</td>
                  <td className="num">{r.manualSales || "—"}</td>
                  <td className="num">{r.manualRevenue ? money(r.manualRevenue) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Payments before 25 Nov 2026 have no marketing data and show as Direct.
      </p>
    </main>
  );
}
