import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { ActionButton } from "@/components/admin/console/ActionButton";
import { AffiliateForm } from "@/components/affiliates/AffiliateForm";
import { CommissionActions, CommissionBulk } from "@/components/affiliates/CommissionTools";
import { LinkRow } from "@/components/affiliates/CopyButton";
import { DailyChart } from "@/components/affiliates/DailyChart";
import { Feed } from "@/components/affiliates/PartnerBits";
import { PayoutForm } from "@/components/affiliates/PayoutForm";
import { PostsManager } from "@/components/affiliates/PostsManager";
import { partnerUrl, postUrl, referralUrls, ruleLabel } from "@/lib/affiliates/core";
import { BLOCKS, parseHidden, postsWithStats, postTotals, salesFeed } from "@/lib/affiliates/dashboard";
import { STATUS_TEXT } from "@/lib/affiliates/partner-view";
import { openPayout } from "@/lib/affiliates/payout";
import { affiliateDaily, affiliateKpis, conversionRate } from "@/lib/affiliates/stats";
import { requireAdminPage } from "@/lib/admin/guard";
import { money } from "@/lib/admin/format";
import { appOrigin, formatIst } from "@/lib/config";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AffiliateDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> }) {
  const { readOnly, role } = await requireAdminPage();
  const { id } = await params;
  const { days: rawDays } = await searchParams;
  const days = rawDays === "90" ? 90 : 30;
  const a = await prisma.affiliate.findUnique({ where: { id } });
  if (!a) notFound();
  const [kpiMap, points, commissions, posts, feed, audit] = await Promise.all([
    affiliateKpis([a.id]),
    affiliateDaily(a.id, days),
    prisma.affiliateCommission.findMany({ where: { affiliateId: a.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    postsWithStats(a.id),
    salesFeed(a.id, 10),
    prisma.adminAudit.findMany({ where: { entity: "affiliate", entityId: a.id }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const k = kpiMap.get(a.id)!;
  const origin = appOrigin();
  const links = referralUrls(origin, a.code);
  const api = `/api/admin/affiliates/${a.id}`;
  const payout = role === "admin" ? openPayout(a.payoutEnc) : null;
  const payoutChanged = a.payoutEnc && a.payoutUpdatedBy === "creator" && !a.payoutCheckedAt;
  const totals = postTotals(posts);
  const pendingCount = commissions.filter((c) => c.status === "pending").length;

  return (
    <main className="page">
      <AdminKicker kicker="Affiliate" readOnly={readOnly} />
      <p>
        <Link href="/sup-admin/affiliates">← All affiliates</Link>
      </p>
      <div className="adm-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{a.name}</h1>
          <p>
            <span className={`pill ${a.status === "active" ? "paid" : a.status}`}>{STATUS_TEXT[a.status] || a.status}</span> <code>{a.code}</code> · {ruleLabel(a)}
            {a.source === "application" ? <span className="muted"> · applied {a.appliedAt ? formatIst(a.appliedAt) : ""}</span> : null}
          </p>
        </div>
        <div className="row-actions">
          {a.status === "pending" || a.status === "rejected" ? (
            <ActionButton url={api} method="PATCH" body={{ action: "approve" }} label="Approve" readOnly={readOnly} />
          ) : null}
          {a.status === "pending" ? (
            <ActionButton url={api} method="PATCH" body={{ action: "reject" }} label="Reject" danger confirmTitle={`Reject ${a.name}?`} readOnly={readOnly} />
          ) : null}
          {a.status === "active" ? (
            <ActionButton url={api} method="PATCH" body={{ action: "pause" }} label="Pause" confirmTitle="Pause this affiliate?" confirmText="New clicks stop being tracked. Earned commission stays." readOnly={readOnly} />
          ) : null}
          {a.status === "paused" ? <ActionButton url={api} method="PATCH" body={{ action: "activate" }} label="Resume" readOnly={readOnly} /> : null}
          <ActionButton
            url={api}
            method="PATCH"
            body={{ action: "regenerateToken" }}
            label="New dashboard link"
            confirmTitle="Make a new dashboard link?"
            confirmText="The old link stops working right away. Send them the new one."
            readOnly={readOnly}
          />
          <ActionButton
            url={api}
            method="DELETE"
            label="Delete"
            danger
            typeToConfirm={a.code}
            confirmTitle="Delete this affiliate?"
            confirmText="Only possible with no live commission. Clicks are deleted; payments keep their amounts."
            redirectTo="/sup-admin/affiliates"
            readOnly={readOnly}
          />
        </div>
      </div>

      {payoutChanged ? (
        <div className="aff-alert">
          <b>Payout details changed</b> by the creator on {formatIst(a.payoutUpdatedAt!)}. Confirm with them on a known number before paying.
          <div style={{ marginTop: 8 }}>
            <ActionButton url={api} method="PATCH" body={{ action: "payoutChecked" }} label="I've checked it" readOnly={readOnly} />
          </div>
        </div>
      ) : null}

      <div className="adm-cols">
        <section className="card">
          <h2>Contact & application</h2>
          <dl className="adm-dl">
            <dt>Email</dt>
            <dd>{a.email || "—"}</dd>
            <dt>Phone</dt>
            <dd>{a.phone ? displayPhone(a.phone) : "—"}</dd>
            <dt>City</dt>
            <dd>{a.city || "—"}</dd>
            <dt>Instagram</dt>
            <dd>
              {a.instagramUrl ? (
                <a href={a.instagramUrl} target="_blank" rel="noopener noreferrer">
                  {a.instagramUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt>TikTok</dt>
            <dd>
              {a.tiktokUrl ? (
                <a href={a.tiktokUrl} target="_blank" rel="noopener noreferrer">
                  {a.tiktokUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt>Followers</dt>
            <dd>{a.followers != null ? new Intl.NumberFormat("en-IN").format(a.followers) : "—"} (self-reported)</dd>
            <dt>Niche</dt>
            <dd>{a.niche || "—"}</dd>
            <dt>Plan</dt>
            <dd style={{ whiteSpace: "pre-wrap" }}>{a.pitch || "—"}</dd>
            {a.reviewedAt ? (
              <>
                <dt>Reviewed</dt>
                <dd>
                  {formatIst(a.reviewedAt)} by {a.reviewedBy}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
        <section className="card">
          <h2>Links</h2>
          <LinkRow label="Creator dashboard (private)" url={partnerUrl(origin, a.token)} />
          <LinkRow label="Offer page" url={links.offer} />
          <LinkRow label="Home" url={links.home} />
          <LinkRow label="Short" url={links.short} />
          {a.status !== "active" ? <p className="muted">Links do not track until the affiliate is active.</p> : null}
        </section>
      </div>

      <section className="adm-section card">
        <h2>Payout account</h2>
        {payout ? (
          <dl className="adm-dl">
            <dt>Holder</dt>
            <dd>{payout.holderName}</dd>
            <dt>UPI ID</dt>
            <dd>
              <code>{payout.upiId || "—"}</code>
            </dd>
            <dt>Bank</dt>
            <dd>{payout.bankAccount ? `${payout.bankName || ""} A/c ${payout.bankAccount} · IFSC ${payout.bankIfsc}` : "—"}</dd>
            <dt>Changed</dt>
            <dd>
              {a.payoutUpdatedAt ? formatIst(a.payoutUpdatedAt) : "—"} by {a.payoutUpdatedBy === "creator" ? "the creator" : a.payoutUpdatedBy}
            </dd>
          </dl>
        ) : a.payoutEnc ? (
          <p>
            {a.payoutMasked} {role === "admin" ? <span className="muted">(could not decrypt; check ENCRYPTION_KEY)</span> : <span className="muted">(full details: admins only)</span>}
          </p>
        ) : (
          <p className="muted">No payout details yet.</p>
        )}
        {readOnly ? null : <PayoutForm url={api} method="PATCH" current={null} />}
        {a.payoutNotes ? <p className="muted">Notes: {a.payoutNotes}</p> : null}
      </section>

      <section className="adm-section">
        <h2>Performance</h2>
        <div className="stats">
          <div className="stat">
            <small>Clicks</small>
            <b>{k.clicks}</b>
          </div>
          <div className="stat">
            <small>Signups</small>
            <b>{k.signups}</b>
          </div>
          <div className="stat y">
            <small>Paid sales</small>
            <b>{k.paid}</b>
          </div>
          <div className="stat">
            <small>Conversion</small>
            <b>{conversionRate(k)}</b>
          </div>
          <div className="stat y">
            <small>Revenue</small>
            <b>{money(k.revenue)}</b>
          </div>
          <div className="stat">
            <small>Earned</small>
            <b>{money(k.earned)}</b>
          </div>
          <div className="stat">
            <small>Pending</small>
            <b>{money(k.pending)}</b>
          </div>
          <div className="stat">
            <small>Approved</small>
            <b>{money(k.approved)}</b>
          </div>
          <div className="stat">
            <small>Paid out</small>
            <b>{money(k.paidOut)}</b>
          </div>
        </div>
        <div className="adm-subnav" style={{ margin: "12px 0" }}>
          <Link href={`?days=30`} className={days === 30 ? "on" : ""}>
            30 days
          </Link>
          <Link href={`?days=90`} className={days === 90 ? "on" : ""}>
            90 days
          </Link>
        </div>
        <DailyChart points={points} />
      </section>

      <section className="adm-section">
        <h2>Recent sales (as the creator sees them)</h2>
        <Feed items={feed} />
      </section>

      <section className="adm-section">
        <h2>Commission</h2>
        <CommissionBulk affiliateId={a.id} approvedTotal={money(k.approved)} pendingCount={pendingCount} readOnly={readOnly} />
        {commissions.length === 0 ? (
          <p className="muted">No commission yet.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th className="num">Sale</th>
                  <th className="num">Commission</th>
                  <th>Status</th>
                  <th>Detail</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td>{formatIst(c.createdAt)}</td>
                    <td>
                      {c.kind}
                      {c.paymentId ? (
                        <div>
                          <Link href={`/sup-admin/payments/${c.paymentId}`}>payment</Link>
                        </div>
                      ) : null}
                    </td>
                    <td className="num">{c.saleAmountInr != null ? money(c.saleAmountInr) : "—"}</td>
                    <td className="num">{money(c.amountInr)}</td>
                    <td>
                      <span className={`pill ${c.status === "paid" ? "paid" : c.status}`}>{c.status}</span>
                    </td>
                    <td className="muted" style={{ maxWidth: 260 }}>
                      {[c.rateLabel, c.note, c.voidReason, c.payoutRef ? `ref ${c.payoutRef}` : null, c.paidAt ? `paid ${formatIst(c.paidAt)}` : null].filter(Boolean).join(" · ")}
                    </td>
                    <td>
                      <CommissionActions id={c.id} status={c.status} readOnly={readOnly} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-section">
        <h2>Content ({posts.length} posts)</h2>
        <p className="muted">
          {new Intl.NumberFormat("en-IN").format(totals.views)} views · {totals.likes} likes · {totals.comments} comments · {totals.shares} shares · {totals.clicks} clicks ·{" "}
          {totals.sales} sales from post links. Numbers are entered by hand (no scraping). Verify to confirm; lock to stop the creator editing.
        </p>
        <PostsManager
          admin
          readOnly={readOnly}
          createUrl={`${api}/posts`}
          base="/api/admin/posts"
          posts={posts.map((p) => ({
            id: p.id,
            platform: p.platform,
            url: p.url,
            title: p.title,
            views: p.views,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            clicks: p.clicks,
            sales: p.sales,
            verified: p.verified,
            locked: p.locked,
            updated: p.metricsUpdatedAt ? `${formatIst(p.metricsUpdatedAt)} by ${p.metricsUpdatedBy?.startsWith("partner:") ? "creator" : p.metricsUpdatedBy}` : "—",
            subLink: postUrl(origin, a.code, p.id),
          }))}
        />
      </section>

      <section className="adm-section">
        <h2>Edit</h2>
        <AffiliateForm
          mode="edit"
          readOnly={readOnly}
          blocks={[...BLOCKS]}
          initial={{
            id: a.id,
            name: a.name,
            email: a.email || "",
            phone: a.phone ? displayPhone(a.phone) : "",
            city: a.city || "",
            instagramUrl: a.instagramUrl || "",
            tiktokUrl: a.tiktokUrl || "",
            followers: a.followers != null ? String(a.followers) : "",
            niche: a.niche || "",
            handles: a.handles || "",
            code: a.code,
            commissionType: a.commissionType,
            rate: String(a.rate),
            status: a.status,
            payoutNotes: a.payoutNotes || "",
            notes: a.notes || "",
            hiddenBlocks: Array.from(parseHidden(a.hiddenBlocks)),
          }}
        />
      </section>

      <section className="adm-section">
        <h2>History</h2>
        {audit.length === 0 ? (
          <p className="muted">Nothing yet.</p>
        ) : (
          <ul className="aff-feed">
            {audit.map((row) => (
              <li key={row.id}>
                <span>{row.summary}</span>
                <small className="muted">
                  {formatIst(row.createdAt)} · {row.actorEmail}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
