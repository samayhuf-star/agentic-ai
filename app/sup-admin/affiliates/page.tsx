import Link from "next/link";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { ActionButton } from "@/components/admin/console/ActionButton";
import { ruleLabel } from "@/lib/affiliates/core";
import { STATUS_TEXT } from "@/lib/affiliates/partner-view";
import { affiliateKpis, conversionRate } from "@/lib/affiliates/stats";
import { requireAdminPage } from "@/lib/admin/guard";
import { money } from "@/lib/admin/format";
import { formatIst } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const n = (x: number | null | undefined) => (x == null ? "—" : new Intl.NumberFormat("en-IN", { notation: "compact" }).format(x));

export default async function AffiliatesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { readOnly } = await requireAdminPage();
  const { status = "all", q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const [pending, affiliates, payoutChanged] = await Promise.all([
    prisma.affiliate.findMany({ where: { status: "pending" }, orderBy: { appliedAt: "asc" }, take: 100 }),
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

      <section className="adm-section">
        <h2>Pending applications ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="muted">No applications waiting.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Social</th>
                  <th className="num">Followers</th>
                  <th>Niche / plan</th>
                  <th>Applied</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/sup-admin/affiliates/${a.id}`}>
                        <b>{a.name}</b>
                      </Link>
                      <div className="muted">
                        {a.email}
                        {a.city ? ` · ${a.city}` : ""}
                      </div>
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
                    <td style={{ maxWidth: 340 }}>
                      <b>{a.niche || "—"}</b>
                      <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                        {(a.pitch || "").slice(0, 220)}
                        {(a.pitch || "").length > 220 ? "…" : ""}
                      </div>
                    </td>
                    <td>{a.appliedAt ? formatIst(a.appliedAt) : formatIst(a.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <ActionButton url={`/api/admin/affiliates/${a.id}`} method="PATCH" body={{ action: "approve" }} label="Approve" readOnly={readOnly} />
                        <ActionButton
                          url={`/api/admin/affiliates/${a.id}`}
                          method="PATCH"
                          body={{ action: "reject" }}
                          label="Reject"
                          danger
                          confirmTitle={`Reject ${a.name}?`}
                          confirmText="Their link stays inactive and their page shows Not approved. You can approve later."
                          readOnly={readOnly}
                        />
                      </div>
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
                  <th className="num">Paid</th>
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
