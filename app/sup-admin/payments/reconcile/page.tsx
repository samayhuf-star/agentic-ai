import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { ActionButton } from "@/components/admin/console/ActionButton";
import { requireAdminPage } from "@/lib/admin/guard";
import { money } from "@/lib/admin/format";
import { cashfreeTarget, gatewayHasKeys } from "@/lib/payments/gateways";
import { reconcile } from "@/lib/payments/reconcile";
import { maskEmail } from "@/lib/affiliates/core";

export const dynamic = "force-dynamic";

const FLAG: Record<string, [string, string]> = {
  missing_here: ["Paid at Cashfree, no record here", "aff-bad"],
  not_paid_here: ["Paid at Cashfree, not paid here", "aff-bad"],
  refund: ["Refunded at Cashfree, not here", "aff-bad"],
  paid_here_not_cashfree: ["Paid here, no Cashfree success", "aff-bad"],
  amount: ["Amount differs", "aff-bad"],
  not_confirmed: ["Paid, confirmation mark missing", ""],
  ok: ["Match", ""],
  open: ["Not paid (both)", "muted"],
};

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const { days: raw } = await searchParams;
  const days = raw === "1" ? 1 : raw === "30" ? 30 : 7;
  const to = new Date();
  const from = new Date(Date.now() - days * 864e5);
  const result = await reconcile(from, to);
  const problems = result.lines.filter((l) => !["ok", "open"].includes(l.flag)).length;
  const target = cashfreeTarget();
  return (
    <main className="page">
      <AdminKicker kicker="Payments" readOnly={readOnly} />
      <h1>Cashfree reconciliation</h1>
      <p className="muted">
        Cashfree&apos;s own ledger for the last {days} day{days > 1 ? "s" : ""} against our records. A sale counts only when Cashfree confirmed it (signed webhook or our server reading PAID from Cashfree).
      </p>
      <div className="card" style={{ marginBottom: 12 }}>
        <b>Server setup:</b> CASHFREE_APP_ID {process.env.CASHFREE_APP_ID ? "✓ set" : "✗ missing"} · CASHFREE_SECRET_KEY {process.env.CASHFREE_SECRET_KEY ? "✓ set" : "✗ missing"} · CASHFREE_ENV{" "}
        {process.env.CASHFREE_ENV || "(unset → TEST)"} ({target.mode}) · keys usable: {gatewayHasKeys("cashfree") ? "yes" : "no"}
      </div>
      <div className="adm-subnav" style={{ marginBottom: 12 }}>
        {[1, 7, 30].map((d) => (
          <Link key={d} href={`?days=${d}`} className={d === days ? "on" : ""}>
            {d === 1 ? "24 hours" : `${d} days`}
          </Link>
        ))}
      </div>
      {!result.ok ? (
        <div className="aff-alert">Could not read Cashfree: {result.error}</div>
      ) : (
        <>
          <p>{problems ? <b className="aff-bad">{problems} mismatch{problems > 1 ? "es" : ""}</b> : "No mismatches."}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Cashfree</th>
                  <th className="num">Cashfree ₹</th>
                  <th>Ours</th>
                  <th className="num">Our ₹</th>
                  <th>Result</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.orderId}>
                    <td>
                      {l.ours ? <Link href={`/sup-admin/payments/${encodeURIComponent(l.orderId)}`}>{l.orderId}</Link> : l.orderId}
                      {l.ours?.email ? <div className="muted">{maskEmail(l.ours.email)}</div> : null}
                    </td>
                    <td>
                      {l.cf ? (l.cf.paid ? (l.cf.refunded ? "paid, refunded" : "PAID") : l.cf.lastStatus.toLowerCase()) : "—"}
                      {l.cf?.at ? <div className="muted">{l.cf.at.replace("T", " ").slice(0, 16)}</div> : null}
                    </td>
                    <td className="num">{l.cf?.amount != null ? money(Math.round(l.cf.amount)) : "—"}</td>
                    <td>
                      {l.ours ? `${l.ours.status}${l.ours.confirmed ? " ✓" : ""}${l.ours.isTest ? " (test)" : ""}` : "—"}
                    </td>
                    <td className="num">{l.ours ? money(l.ours.amountInr) : "—"}</td>
                    <td className={FLAG[l.flag][1]}>{FLAG[l.flag][0]}</td>
                    <td>
                      {l.ours && !["ok", "open"].includes(l.flag) ? (
                        <ActionButton url="/api/admin/reconcile" method="POST" body={{ orderId: l.orderId }} label="Re-check with Cashfree" readOnly={readOnly} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
