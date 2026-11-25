import Link from "next/link";
import { LinkRow } from "@/components/affiliates/CopyButton";
import { DailyChart } from "@/components/affiliates/DailyChart";
import { Feed, inr, num, Stat, StatusBanner } from "@/components/affiliates/PartnerBits";
import { referralUrls, ruleLabel } from "@/lib/affiliates/core";
import { salesFeed } from "@/lib/affiliates/dashboard";
import { loadPartner } from "@/lib/affiliates/partner-view";
import { affiliateDaily, affiliateKpis, conversionRate, type AffiliateKpis } from "@/lib/affiliates/stats";
import { appOrigin } from "@/lib/config";

export const dynamic = "force-dynamic";

const ZERO: AffiliateKpis = { clicks: 0, signups: 0, paid: 0, revenue: 0, manualPaid: 0, manualRevenue: 0, earned: 0, pending: 0, approved: 0, paidOut: 0, voided: 0 };

export default async function PartnerOverview({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ days?: string }> }) {
  const { token } = await params;
  const { days: rawDays } = await searchParams;
  const days = rawDays === "90" ? 90 : 30;
  const { affiliate: a, approved, show } = await loadPartner(token);
  const links = referralUrls(appOrigin(), a.code);
  const k = approved ? (await affiliateKpis([a.id])).get(a.id) || ZERO : ZERO;
  const [points, feed] = await Promise.all([
    show("chart") ? affiliateDaily(a.id, days) : Promise.resolve(null),
    show("feed") ? salesFeed(a.id, 5) : Promise.resolve(null),
  ]);
  const showSales = !approved || show("sales");
  const showCommission = !approved || show("commission");
  const base = `/partner/${token}`;

  return (
    <main className="page">
      <p className="kicker">Partner dashboard</p>
      <h1 style={{ marginBottom: 4 }}>Hi {a.name.split(" ")[0]}</h1>
      {approved ? <p className="muted">Your commission: {ruleLabel(a)}. Tracking lasts 30 days from a click; the last link clicked gets the sale.</p> : null}
      <StatusBanner status={a.status} />
      {approved && !a.payoutEnc ? (
        <div className="aff-review">
          <b>Add payout details</b> so we can pay your commission.{" "}
          <Link href={`/partner/${token}/payouts`} prefetch={false}>
            Add them now →
          </Link>
        </div>
      ) : null}

      <section className="adm-section">
        <h2>Your links</h2>
        {approved ? null : <p className="muted">These start tracking once you&apos;re approved.</p>}
        <LinkRow label="Offer page (best for posts)" url={links.offer} />
        <LinkRow label="Home page" url={links.home} />
        <LinkRow label="Short link" url={links.short} />
        <p className="muted">
          For a link per post, add the post under{" "}
          <Link href={`${base}/content`} prefetch={false}>
            Content analytics
          </Link>
          .
        </p>
      </section>

      <section className="adm-section">
        <h2>Totals</h2>
        <div className="stats">
          {showSales ? (
            <>
              <Stat big label="Total conversions" value={num(k.paid + k.manualPaid)} sub="paid sales" />
              <Stat big label="Total billing" value={inr(k.revenue + k.manualRevenue)} sub="sale value you brought in" />
            </>
          ) : null}
          {showCommission ? <Stat big label="Commission earned" value={inr(k.earned)} sub="pending + confirmed + paid" /> : null}
        </div>
        <div className="stats" style={{ marginTop: 12 }}>
          {!approved || show("clicks") ? <Stat label="Clicks" value={num(k.clicks)} /> : null}
          {!approved || show("signups") ? <Stat label="Signups" value={num(k.signups)} sub="started checkout" /> : null}
          {showSales ? <Stat label="Conversion" value={conversionRate(k)} sub="sales ÷ clicks" /> : null}
          {showCommission ? (
            <>
              <Stat label="Pending" value={inr(k.pending)} />
              <Stat label="Confirmed" value={inr(k.approved)} sub="due in next payout" />
              <Stat label="Paid to you" value={inr(k.paidOut)} />
            </>
          ) : null}
        </div>
      </section>

      {points ? (
        <section className="adm-section">
          <div className="adm-head">
            <h2>Last {days} days</h2>
            <div className="adm-subnav">
              <Link href={`${base}?days=30`} className={days === 30 ? "on" : ""} prefetch={false}>
                30 days
              </Link>
              <Link href={`${base}?days=90`} className={days === 90 ? "on" : ""} prefetch={false}>
                90 days
              </Link>
            </div>
          </div>
          <DailyChart points={points} />
        </section>
      ) : null}

      {feed ? (
        <section className="adm-section">
          <h2>Recent sales</h2>
          <Feed items={feed} />
          {show("sales") ? (
            <p>
              <Link href={`${base}/sales`} prefetch={false}>
                All sales →
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
