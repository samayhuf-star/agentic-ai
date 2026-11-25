import { notFound } from "next/navigation";
import { Feed, num, StatusBanner } from "@/components/affiliates/PartnerBits";
import { salesFeed } from "@/lib/affiliates/dashboard";
import { loadPartner } from "@/lib/affiliates/partner-view";
import { affiliateKpis } from "@/lib/affiliates/stats";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

export default async function PartnerSales({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { affiliate: a, approved, show, hidden } = await loadPartner(token);
  if (hidden.has("sales")) notFound();
  const k = approved ? (await affiliateKpis([a.id])).get(a.id) : null;
  const clicks = k && show("clicks") ? k.clicks : null;
  const signups = k && show("signups") ? k.signups : null;
  const sales = (k?.paid ?? 0) + (k?.manualPaid ?? 0);
  const steps = [
    { label: "Clicks", n: clicks },
    { label: "Signups", n: signups },
    { label: "Sales", n: sales },
  ].filter((s): s is { label: string; n: number } => s.n !== null || !approved).map((s) => ({ ...s, n: s.n ?? 0 }));
  const max = Math.max(1, ...steps.map((s) => s.n));
  const feed = show("feed") ? await salesFeed(a.id, 50) : null;

  return (
    <main className="page">
      <p className="kicker">Sales &amp; conversions</p>
      <h1>How your link converts</h1>
      <StatusBanner status={a.status} />
      <section className="adm-section card">
        <h2>Funnel</h2>
        <div className="aff-funnel">
          {steps.map((s, i) => (
            <div key={s.label} className="aff-funnel-row">
              <span>{s.label}</span>
              <div className="aff-funnel-bar" style={{ width: `${Math.max(1, (s.n / max) * 100)}%` }} />
              <span>
                <b>{num(s.n)}</b>
                {i > 0 ? <small className="muted"> {pct(s.n, steps[i - 1].n)}</small> : null}
              </span>
            </div>
          ))}
        </div>
        {clicks !== null ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Click to sale: <b>{pct(sales, clicks)}</b>
          </p>
        ) : null}
      </section>
      {feed ? (
        <section className="adm-section">
          <h2>Sales</h2>
          <Feed items={feed} />
        </section>
      ) : null}
    </main>
  );
}
