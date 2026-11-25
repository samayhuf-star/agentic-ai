import { Prisma } from "@prisma/client";
import { istDayExpr, istDayKey } from "@/lib/ist";
import { prisma } from "@/lib/prisma";

export type AffiliateKpis = {
  clicks: number;
  signups: number;
  paid: number;
  revenue: number;
  earned: number;
  pending: number;
  approved: number;
  paidOut: number;
  voided: number;
};

const empty = (): AffiliateKpis => ({ clicks: 0, signups: 0, paid: 0, revenue: 0, earned: 0, pending: 0, approved: 0, paidOut: 0, voided: 0 });

/**
 * signups = distinct buyers (email, else payment) who started an attributed checkout or got an attributed manual payment.
 * paid = distinct paid real payments. revenue = their total.
 * earned = pending + approved + paid commission entries (sales, clawbacks and adjustments, net).
 */
export async function affiliateKpis(ids: string[]): Promise<Map<string, AffiliateKpis>> {
  const out = new Map(ids.map((id) => [id, empty()]));
  if (ids.length === 0) return out;
  const [clicks, signups, paid, commissions] = await Promise.all([
    prisma.affiliateClick.groupBy({ by: ["affiliateId"], where: { affiliateId: { in: ids } }, _count: { _all: true } }),
    prisma.$queryRaw<{ affiliateId: string; n: number }[]>`
      SELECT "affiliateId", COUNT(DISTINCT COALESCE(LOWER(email), id))::int AS n
      FROM "Payment" WHERE "affiliateId" IN (${Prisma.join(ids)}) AND "isTest" = false
      GROUP BY "affiliateId"`,
    prisma.payment.groupBy({
      by: ["affiliateId"],
      where: { affiliateId: { in: ids }, status: "paid", isTest: false },
      _count: { _all: true },
      _sum: { amountInr: true },
    }),
    prisma.affiliateCommission.groupBy({ by: ["affiliateId", "status"], where: { affiliateId: { in: ids } }, _sum: { amountInr: true } }),
  ]);
  for (const row of clicks) out.get(row.affiliateId)!.clicks = row._count._all;
  for (const row of signups) out.get(row.affiliateId)!.signups = row.n;
  for (const row of paid) {
    if (!row.affiliateId) continue;
    const k = out.get(row.affiliateId)!;
    k.paid = row._count._all;
    k.revenue = row._sum.amountInr || 0;
  }
  for (const row of commissions) {
    const k = out.get(row.affiliateId)!;
    const sum = row._sum.amountInr || 0;
    if (row.status === "pending") k.pending += sum;
    else if (row.status === "approved") k.approved += sum;
    else if (row.status === "paid") k.paidOut += sum;
    else if (row.status === "void") k.voided += sum;
  }
  for (const k of out.values()) k.earned = k.pending + k.approved + k.paidOut;
  return out;
}

export type DayPoint = { day: string; clicks: number; paid: number; commission: number };

export async function affiliateDaily(affiliateId: string, days: number): Promise<DayPoint[]> {
  const since = new Date(Date.now() - days * 86400000);
  const clickDay = Prisma.raw(istDayExpr('"createdAt"'));
  const paidDay = Prisma.raw(istDayExpr('COALESCE("paidAt", "createdAt")'));
  const [clicks, paid, commission] = await Promise.all([
    prisma.$queryRaw<{ day: string; n: number }[]>`
      SELECT ${clickDay} AS day, COUNT(*)::int AS n FROM "AffiliateClick"
      WHERE "affiliateId" = ${affiliateId} AND "createdAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ day: string; n: number }[]>`
      SELECT ${paidDay} AS day, COUNT(*)::int AS n FROM "Payment"
      WHERE "affiliateId" = ${affiliateId} AND status = 'paid' AND "isTest" = false AND COALESCE("paidAt", "createdAt") >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ day: string; n: number }[]>`
      SELECT ${clickDay} AS day, COALESCE(SUM("amountInr"), 0)::int AS n FROM "AffiliateCommission"
      WHERE "affiliateId" = ${affiliateId} AND status <> 'void' AND "createdAt" >= ${since} GROUP BY 1`,
  ]);
  const map = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = istDayKey(new Date(Date.now() - i * 86400000));
    map.set(key, { day: key, clicks: 0, paid: 0, commission: 0 });
  }
  for (const r of clicks) if (map.has(r.day)) map.get(r.day)!.clicks = r.n;
  for (const r of paid) if (map.has(r.day)) map.get(r.day)!.paid = r.n;
  for (const r of commission) if (map.has(r.day)) map.get(r.day)!.commission = r.n;
  return Array.from(map.values());
}

export function conversionRate(k: { clicks: number; paid: number }) {
  if (!k.clicks) return "—";
  return `${((k.paid / k.clicks) * 100).toFixed(1)}%`;
}
