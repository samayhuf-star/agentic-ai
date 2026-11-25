import { inr, Stat, StatusBanner } from "@/components/affiliates/PartnerBits";
import { PayoutForm } from "@/components/affiliates/PayoutForm";
import { payoutHistory } from "@/lib/affiliates/dashboard";
import { loadPartner } from "@/lib/affiliates/partner-view";
import { affiliateKpis } from "@/lib/affiliates/stats";
import { formatIst } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PartnerPayouts({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { affiliate: a, approved, show } = await loadPartner(token);
  const k = show("commission") ? (await affiliateKpis([a.id])).get(a.id) : null;
  const history = show("payouts") ? await payoutHistory(a.id) : null;
  return (
    <main className="page">
      <p className="kicker">Payouts</p>
      <h1>Payouts</h1>
      <StatusBanner status={a.status} />
      {k ? (
        <div className="stats">
          <Stat label="Pending" value={inr(k.pending)} sub="being checked" />
          <Stat label="Confirmed" value={inr(k.approved)} sub="due in next payout" />
          <Stat label="Paid to you" value={inr(k.paidOut)} />
        </div>
      ) : null}
      <section className="adm-section card">
        <h2>Your payout account</h2>
        <p>Commission payouts are paid to your account below.</p>
        {a.status === "rejected" ? (
          <p className="muted">Not available.</p>
        ) : a.status === "pending" ? (
          <p className="muted">
            <b>Add payout details after approval.</b> Once you&apos;re approved, you can add your UPI ID or bank account here.
          </p>
        ) : (
          <PayoutForm url={`/api/partner/${token}/payout`} method="PUT" current={a.payoutMasked} />
        )}
        {a.payoutUpdatedAt ? <p className="muted">Last changed {formatIst(a.payoutUpdatedAt)}. For your safety, we check any change before the next payout.</p> : null}
      </section>
      {history ? (
        <section className="adm-section">
          <h2>Payout history</h2>
          {history.length === 0 ? (
            <p className="muted">{approved ? "No payouts yet." : "Nothing yet."}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Paid on</th>
                    <th className="num">Amount</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td>{h.paidAt ? formatIst(h.paidAt) : "—"}</td>
                      <td className="num">{inr(h.total)}</td>
                      <td>{h.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
