import { StatsBar } from "@/components/admin/StatsBar";
import { requireAdminPage } from "@/lib/admin/guard";
import { readStatsRange } from "@/lib/admin/range";
import { funnelSnapshot } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tests?: string }>;
}) {
  await requireAdminPage();
  const range = readStatsRange(await searchParams);
  const steps = await funnelSnapshot(range);
  const base = steps.find((step) => step.label === "Checkout submitted")?.count || 0;
  const empty = base === 0;
  return (
    <main className="page stats-page">
      <p className="br-kicker">Funnel</p>
      <h1>From checkout to first chat</h1>
      <p className="muted">Percents are of checkout submitted. Landing and Buy click are not stored yet.</p>
      <StatsBar range={range} path="/sup-admin/stats/funnel" />
      {empty ? <p className="banner">No data yet.</p> : null}
      <ol className="funnel">
        {steps.map((step) => {
          const percent = step.count == null || base === 0 ? null : Math.round((step.count / base) * 100);
          return (
            <li key={step.label}>
              <b>{step.label}</b>
              <span>{step.count == null ? "—" : step.count}</span>
              <small>{step.note || (percent == null ? "" : `${percent}%`)}</small>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
