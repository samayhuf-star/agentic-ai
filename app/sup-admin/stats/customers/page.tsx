import { AdminKicker } from "@/components/admin/AdminKicker";
import { StatsBar } from "@/components/admin/StatsBar";
import { PROVIDER_LABEL, isProvider } from "@/lib/ai/models";
import { requireAdminPage } from "@/lib/admin/guard";
import { readStatsRange } from "@/lib/admin/range";
import { customerSnapshot } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";

export default async function CustomerStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tests?: string }>;
}) {
  const { readOnly } = await requireAdminPage();
  const range = readStatsRange(await searchParams);
  const customers = await customerSnapshot(range);
  const empty = customers.signups === 0 && customers.paid === 0 && customers.keys.length === 0;
  return (
    <main className="page stats-page">
      <AdminKicker kicker="Customers" readOnly={readOnly} />
      <h1>Real customers</h1>
      <p className="muted">Admin emails, staff emails, free-access accounts, and people who only have a test payment are left out. Keys are counted, never shown.</p>
      <StatsBar range={range} path="/sup-admin/stats/customers" />
      {empty ? <p className="banner">No data yet.</p> : null}
      <div className="stats">
        <div className="stat">
          <small>Signups</small>
          <b>{customers.signups}</b>
        </div>
        <div className="stat">
          <small>Paid customers</small>
          <b>{customers.paid}</b>
        </div>
        <div className="stat">
          <small>Onboarding done</small>
          <b>{customers.onboarded}</b>
        </div>
        <div className="stat">
          <small>First chat</small>
          <b>{customers.firstChat}</b>
        </div>
        <div className="stat">
          <small>Active 7 days</small>
          <b>{customers.active7}</b>
        </div>
        <div className="stat">
          <small>Active 30 days</small>
          <b>{customers.active30}</b>
        </div>
      </div>
      <h2>AI key connected</h2>
      {customers.keys.length === 0 ? (
        <p className="muted">No data yet.</p>
      ) : (
        <ul>
          {customers.keys.map((row) => (
            <li key={row.provider}>
              {isProvider(row.provider) ? PROVIDER_LABEL[row.provider] : row.provider}: {row.count}
            </li>
          ))}
        </ul>
      )}
      <p className="muted">Active customers are people with a sign-in or a chat in that window. That is already in the database.</p>
    </main>
  );
}
