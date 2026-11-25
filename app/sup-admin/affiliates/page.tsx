import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { DecisionButtons } from "@/components/affiliates/DecisionButtons";
import { ruleLabel } from "@/lib/affiliates/core";
import { STATUS_TEXT } from "@/lib/affiliates/partner-view";
import { affiliateKpis, conversionRate } from "@/lib/affiliates/stats";
import { requireAdminPage } from "@/lib/admin/guard";
import { money } from "@/lib/admin/format";
import { formatIst } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const n = (x: number | null | undefined) => (x == null ? "—" : new Intl.NumberFormat("en-IN", { notation: "compact" }).format(x));

const EMAIL_TEXT: Record<string, string> = { sent: "sent", failed: "FAILED", not_configured: "not sent (no Resend)", no_email: "no email" };

export default async function AffiliatesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; app?: string; sort?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const { status = "all", q = "", app: rawApp = "pending", sort: rawSort = "applied" } = await searchParams;
  const app = ["pending", "all", "active", "rejected", "paused"].includes(rawApp) ? rawApp : "pending";
  const sort = ["applied", "newest", "followers"].includes(rawSort) ? rawSort : "applied";
  const resendOn = Boolean(process.env.RESEND_API_KEY);
  const query = q.trim().slice(0, 80);
  const [applications, pendingCount, affiliates, payoutChanged] = await Promise.all([
    prisma.affiliate.findMany({
      where: { source: "application", ...(app === "all" ? {} : { status: app }) },
      orderBy: sort === "followers" ? [{ followers: { sort: "desc", nulls: "last" } }] : { appliedAt: sort === "newest" ? "desc" : "asc" },
      take: 200,
    }),
    prisma.affiliate.count({ where: { status: "pending" } }),
    prisma.affiliate.findMany({
      where: {
        status: status === "all" ? { not: "pending" } : status,
        ...(query
          ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }, { code: { contains: query.toUpperCase() } }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.affiliate.count({ where: { payoutUpdatedBy: "creator", payoutCheckedAt: null, payoutEnc: { not: null } } }),
  ]);
  const kpis = await affiliateKpis(affiliates.map((a) => a.id));

  return (
    <main className="page">
      <AdminKicker kicker="Affiliates" readOnly={readOnly} />
      <div className="adm-head">
        <h1>Affiliates & creators</h1>
        <div className="row-actions">
          <Link className="btn btn-g btn-sm" href="/partners/apply" target="_blank">
            Public apply page ↗
          </Link>
          {readOnly ? null : (
            <Link className="btn btn-p btn-sm" href="/sup-admin/affiliates/new">
              + Add affiliate
            </Link>
          )}
        </div>
      </div>
      {payoutChanged ? (
        <div className="aff-alert">
          <b>{payoutChanged} creator{payoutChanged > 1 ? "s" : ""} changed payout details.</b> Check before paying (open their page, look for &quot;Payout details
          changed&quot;).
        </div>
      ) : null}

      {!resendOn ? (
        <div className="aff-alert">
          <b>Email is not set up.</b> RESEND_API_KEY is missing, so approval and rejection emails are not sent. Decisions still save; use Resend email once it&apos;s set up.
        </div>
      ) : null}

      <section className="adm-section">
        <div className="adm-head">
          <h2>Applications ({applications.length}{pendingCount ? `, ${pendingCount} waiting` : ""})</h2>
          <form className="adm-toolbar" style={{ margin: 0 }}>
            <select name="app" defaultValue={app}>
              <option value="pending">Waiting for review</option>
              <option value="all">All applications</option>
              <option value="active">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paused">Paused</option>
            </select>
            <select name="sort" defaultValue={sort}>
              <option value="applied">Oldest first</option>
              <option value="newest">Newest first</option>
              <option value="followers">Most followers</option>
            </select>
            <button className="btn btn-g btn-sm" type="submit">
              Show
            </button>
          </form>
        </div>
        {applications.length === 0 ? (
          <p className="muted">No applications here.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Platforms</th>
                  <th className="num">Followers</th>
                  <th>Niche</th>
                  <th>City</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td style={{ maxWidth: 260 }}>
                      <Link href={`/sup-admin/affiliates/${a.id}`}>
                        <b>{a.name}</b>
                      </Link>
                      <div className="muted">{a.email}</div>
                      {a.pitch ? (
                        <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                          {a.pitch.slice(0, 160)}
                          {a.pitch.length > 160 ? "…" : ""}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {a.instagramUrl ? (
                        <a href={a.instagramUrl} target="_blank" rel="noopener noreferrer">
                          Instagram ↗
                        </a>
                      ) : null}
                      {a.instagramUrl && a.tiktokUrl ? <br /> : null}
                      {a.tiktokUrl ? (
                        <a href={a.tiktokUrl} target="_blank" rel="noopener noreferrer">
                          TikTok ↗
                        </a>
                      ) : null}
                    </td>
                    <td className="num">{n(a.followers)}</td>
                    <td>{a.niche || "—"}</td>
                    <td>{a.city || "—"}</td>
                    <td>{formatIst(a.appliedAt || a.createdAt)}</td>
                    <td>
                      <span className={`pill ${a.status === "active" ? "paid" : a.status}`}>{STATUS_TEXT[a.status] || a.status}</span>
                      {a.rejectReason ? <div className="muted">{a.rejectReason}</div> : null}
                    </td>
                    <td>
                      {a.lastEmailStatus ? (
                        <span className={a.lastEmailStatus === "sent" ? "" : "aff-bad"} title={a.lastEmailError || undefined}>
                          {a.lastEmailKind} · {EMAIL_TEXT[a.lastEmailStatus] || a.lastEmailStatus}
                          <div className="muted">{a.lastEmailAt ? formatIst(a.lastEmailAt) : ""}</div>
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <DecisionButtons id={a.id} status={a.status} canResend={a.status !== "pending" && a.lastEmailStatus !== "sent"} readOnly={readOnly} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-section">
        <form className="adm-toolbar">
          <input name="q" defaultValue={query} placeholder="Search name, email or code" className="grow" />
          <select name="status" defaultValue={status}>
            <option value="all">All (not pending)</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="btn btn-g btn-sm" type="submit">
            Filter
          </button>
        </form>
        {affiliates.length === 0 ? (
          <p className="muted">No affiliates yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th>Status</th>
                  <th className="num">Clicks</th>
                  <th className="num">Signups</th>
                  <th className="num">Paid (Cashfree)</th>
                  <th className="num">Manual</th>
                  <th className="num">Conv.</th>
                  <th className="num">Revenue</th>
                  <th className="num">Earned</th>
                  <th className="num">Pending</th>
                  <th className="num">Approved</th>
                  <th className="num">Paid out</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => {
                  const k = kpis.get(a.id)!;
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/sup-admin/affiliates/${a.id}`}>
                          <b>{a.name}</b>
                        </Link>
                        <div className="muted">
                          {a.code} · {ruleLabel(a)}
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${a.status === "active" ? "paid" : a.status}`}>{STATUS_TEXT[a.status] || a.status}</span>
                      </td>
                      <td className="num">{k.clicks}</td>
                      <td className="num">{k.signups}</td>
                      <td className="num">{k.paid}</td>
                      <td className="num">{k.manualPaid ? `${k.manualPaid} · ${money(k.manualRevenue)}` : "—"}</td>
                      <td className="num">{conversionRate(k)}</td>
                      <td className="num">{money(k.revenue)}</td>
                      <td className="num">{money(k.earned)}</td>
                      <td className="num">{money(k.pending)}</td>
                      <td className="num">{money(k.approved)}</td>
                      <td className="num">{money(k.paidOut)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
