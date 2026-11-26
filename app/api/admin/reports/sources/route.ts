import { requireSuperAdmin } from "@/lib/admin/api";
import { prisma } from "@/lib/prisma";
import { istRange, readDim, readTouch, salesBySource, toCsv } from "@/lib/marketing/report";
import { sourceFromStored } from "@/lib/marketing/touch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireSuperAdmin(request, { write: false });
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const { from, to, fromDay, toDay } = istRange(url.searchParams.get("from") || undefined, url.searchParams.get("to") || undefined);
  let csv: string;
  let name: string;
  if (url.searchParams.get("rows") === "payments") {
    const payments = await prisma.payment.findMany({
      where: { isTest: false, status: "paid", OR: [{ gateway: "manual" }, { gateway: "cashfree", gatewayConfirmedAt: { not: null } }], paidAt: { gte: from, lt: to } },
      orderBy: { paidAt: "asc" },
      take: 20000,
    });
    const get = (j: unknown, k: string) => (j && typeof j === "object" ? ((j as Record<string, unknown>)[k] as string | undefined) : undefined);
    csv = toCsv([
      ["order_id", "paid_at_utc", "amount_inr", "kind", "affiliate_id", "source_label", "channel_first", "channel_last", "source", "medium", "campaign", "term", "content", "landing", "referrer", "gclid", "gbraid", "wbraid", "fbclid", "ttclid"],
      ...payments.map((p) => [
        p.id,
        p.paidAt?.toISOString(),
        p.amountInr,
        p.gateway === "manual" ? "manual" : "cashfree",
        p.affiliateId,
        sourceFromStored(p.mktLast || p.mktFirst, p.channelLast || p.channelFirst, { affiliate: Boolean(p.affiliateId) }),
        p.channelFirst,
        p.channelLast,
        get(p.mktLast, "s"),
        get(p.mktLast, "m"),
        get(p.mktLast, "c"),
        get(p.mktLast, "t"),
        get(p.mktLast, "n"),
        get(p.mktLast, "p"),
        get(p.mktLast, "r"),
        p.gclid,
        get(p.mktLast, "gb"),
        get(p.mktLast, "w"),
        get(p.mktLast, "f"),
        get(p.mktLast, "k"),
      ]),
    ]);
    name = `sales-${fromDay}-to-${toDay}.csv`;
  } else {
    const dim = readDim(url.searchParams.get("dim") || undefined);
    const touch = readTouch(url.searchParams.get("touch") || undefined);
    const rows = await salesBySource(from, to, dim, touch);
    csv = toCsv([
      [dim, "visitors", "signups", "checkouts_started", "sales_cashfree", "revenue_inr_cashfree", "conversion_pct", "manual_sales", "manual_revenue_inr"],
      ...rows.map((r) => [r.key, r.visitors, r.signups, r.checkouts, r.sales, r.revenue, r.checkouts ? ((r.sales / r.checkouts) * 100).toFixed(1) : "", r.manualSales, r.manualRevenue]),
    ]);
    name = `sales-by-${dim}-${touch}-touch-${fromDay}-to-${toDay}.csv`;
  }
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
