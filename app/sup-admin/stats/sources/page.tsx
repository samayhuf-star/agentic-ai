import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { requireAdminPage } from "@/lib/admin/guard";
import { money } from "@/lib/admin/format";
import { istRange, readDim, readTouch, salesBySource } from "@/lib/marketing/report";

export const dynamic = "force-dynamic";

const DIMS = [
  ["source", "Source"],
  ["channel", "Channel"],
  ["campaign", "Campaign"],
] as const;

export default async function SalesBySourcePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; dim?: string; touch?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const sp = await searchParams;
  const { from, to, fromDay, toDay } = istRange(sp.from, sp.to);
  const dim = readDim(sp.dim);
  const touch = readTouch(sp.touch);
  const rows = await salesBySource(from, to, dim, touch);
  const total = rows.reduce(
    (t, r) => ({
      visitors: t.visitors + r.visitors,
      signups: t.signups + r.signups,
      checkouts: t.checkouts + r.checkouts,
      sales: t.sales + r.sales,
      revenue: t.revenue + r.revenue,
      manual: t.manual + r.manualSales,
      manualRev: t.manualRev + r.manualRevenue,
    }),
    { visitors: 0, signups: 0, checkouts: 0, sales: 0, revenue: 0, manual: 0, manualRev: 0 },
  );
  const q = (extra: Record<string, string>) => `?${new URLSearchParams({ from: fromDay, to: toDay, dim, touch, ...extra })}`;
  const csv = `/api/admin/reports/sources${q({})}`;
  const conv = (sales: number, checkouts: number) => (checkouts ? `${((sales / checkouts) * 100).toFixed(1)}%` : "—");
  return (
    <main className="page">
      <AdminKicker kicker="Stats" readOnly={readOnly} />
      <h1>Sources</h1>
      <p className="muted">
        First-touch and last-touch from ads, organic social, search, affiliates and referrals. Sales and revenue count only Cashfree-confirmed payments. Staff and test traffic are left out. Dates are IST. Older orders with no recorded source show as Unknown.
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
          <small>Visitors</small>
          <b>{total.visitors}</b>
        </div>
        <div className="stat">
          <small>Signups</small>
          <b>{total.signups}</b>
        </div>
        <div className="stat">
          <small>Checkouts started</small>
          <b>{total.checkouts}</b>
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
          <b>{conv(total.sales, total.checkouts)}</b>
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
              <th className="num">Visitors</th>
              <th className="num">Signups</th>
              <th className="num">Checkouts</th>
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
                <td colSpan={9} className="muted">
                  Nothing in this range.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}</td>
                  <td className="num">{r.visitors || "—"}</td>
                  <td className="num">{r.signups || "—"}</td>
                  <td className="num">{r.checkouts || "—"}</td>
                  <td className="num">{r.sales || "—"}</td>
                  <td className="num">{r.revenue ? money(r.revenue) : "—"}</td>
                  <td className="num">{conv(r.sales, r.checkouts)}</td>
                  <td className="num">{r.manualSales || "—"}</td>
                  <td className="num">{r.manualRevenue ? money(r.manualRevenue) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
