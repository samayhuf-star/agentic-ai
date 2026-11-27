import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { LiveAnalytics } from "@/components/admin/LiveAnalytics";
import { requireAdminPage } from "@/lib/admin/guard";
import { liveAnalytics, liveQuery, readLiveRange } from "@/lib/admin/live-analytics";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
] as const;

export default async function LiveAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; include?: string }>;
}) {
  const { readOnly } = await requireAdminPage();
  const params = await searchParams;
  const range = readLiveRange(params);
  const data = await liveAnalytics(range);
  const query = liveQuery(range);
  const activity = `/sup-admin/activity?${new URLSearchParams({
    type: "visit",
    ...(range.includeTagged ? {} : { tag: "live" }),
    ...(range.fromInput ? { from: range.fromInput } : {}),
    ...(range.toInput ? { to: range.toInput } : {}),
  }).toString()}`;

  return (
    <main className="page stats-page">
      <AdminKicker kicker="Stats" readOnly={readOnly} />
      <div className="adm-head">
        <h1>Live analytics</h1>
      </div>
      <p className="muted">
        Visits, signups, checkouts and payments from the activity log.{" "}
        <Link href={activity}>Open these visits in Activity</Link>
        {range.includeTagged ? ". Admin and test rows are included." : ". Admin and test rows are left out."}
      </p>
      <div className="stats-bar">
        <div className="stats-filters">
          <div className="chip-row">
            {RANGES.map((item) => (
              <Link key={item.key} className={range.key === item.key ? "on" : ""} href={`/sup-admin/stats/live?${liveQuery({ ...range, key: item.key })}`}>
                {item.label}
              </Link>
            ))}
            <Link className={range.key === "custom" ? "on" : ""} href={`/sup-admin/stats/live?${liveQuery({ ...range, key: "custom" })}`}>
              Custom
            </Link>
          </div>
          <form className="stats-filters" action="/sup-admin/stats/live" method="get">
            <input type="hidden" name="range" value="custom" />
            {range.includeTagged ? <input type="hidden" name="include" value="1" /> : null}
            <label>
              From
              <input type="date" name="from" defaultValue={range.fromInput} aria-label="From date" />
            </label>
            <label>
              To
              <input type="date" name="to" defaultValue={range.toInput} aria-label="To date" />
            </label>
            <button className="btn btn-g btn-sm" type="submit">
              Apply
            </button>
          </form>
          <Link href={`/sup-admin/stats/live?${liveQuery({ ...range, includeTagged: !range.includeTagged })}`}>
            {range.includeTagged ? "Hide admin and test" : "Include admin and test"}
          </Link>
        </div>
      </div>
      <LiveAnalytics key={query} initial={data} query={query} />
    </main>
  );
}
