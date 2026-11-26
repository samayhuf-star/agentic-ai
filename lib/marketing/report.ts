import { isInternalEmail } from "@/lib/admin/metrics";
import { prisma } from "@/lib/prisma";
import { sourceFromStored } from "@/lib/marketing/touch";

export type Dim = "source" | "channel" | "campaign";
export type TouchKind = "first" | "last";
export type SourceRow = {
  key: string;
  visitors: number;
  signups: number;
  checkouts: number;
  sales: number;
  revenue: number;
  conversion: number | null;
  manualSales: number;
  manualRevenue: number;
};

function touchOf(row: { mktFirst: unknown; mktLast: unknown; channelFirst: string | null; channelLast: string | null; affiliateId?: string | null }, dim: Dim, touch: TouchKind) {
  const mkt = touch === "first" ? row.mktFirst : row.mktLast;
  const channel = touch === "first" ? row.channelFirst : row.channelLast;
  if (dim === "campaign") {
    if (mkt && typeof mkt === "object") {
      const c = (mkt as { c?: string }).c;
      if (c) return c;
    }
    return row.mktFirst || row.mktLast ? "(none)" : "Unknown";
  }
  if (dim === "channel") {
    if (channel) return channel;
    return mkt ? "Direct" : "Unknown";
  }
  return sourceFromStored(mkt, channel, { affiliate: Boolean(row.affiliateId) && touch === "last" });
}

function blank(): Omit<SourceRow, "key" | "conversion"> {
  return { visitors: 0, signups: 0, checkouts: 0, sales: 0, revenue: 0, manualSales: 0, manualRevenue: 0 };
}

/** Visitors from the visit log; signups = new user accounts; checkouts started; Cashfree-confirmed sales only. */
export async function salesBySource(from: Date, to: Date, dim: Dim, touch: TouchKind): Promise<SourceRow[]> {
  const map = new Map<string, ReturnType<typeof blank>>();
  const ensure = (key: string) => {
    const row = map.get(key) || blank();
    map.set(key, row);
    return row;
  };

  const [users, payments] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { email: true, mktFirst: true, mktLast: true, channelFirst: true, channelLast: true },
    }),
    prisma.payment.findMany({
      where: { isTest: false, OR: [{ createdAt: { gte: from, lt: to } }, { paidAt: { gte: from, lt: to } }] },
      select: {
        email: true,
        status: true,
        gateway: true,
        gatewayConfirmedAt: true,
        amountInr: true,
        createdAt: true,
        paidAt: true,
        mktFirst: true,
        mktLast: true,
        channelFirst: true,
        channelLast: true,
        affiliateId: true,
      },
    }),
  ]);

  if (dim === "source") {
    // Unique visitors need a distinct count, not row counts from groupBy on source alone.
    const unique = await prisma.$queryRaw<{ key: string; visitors: number }[]>`
      SELECT source AS key, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "MarketingVisit"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY source`;
    for (const row of unique) ensure(row.key).visitors += row.visitors;
  } else if (dim === "channel") {
    const unique = await prisma.$queryRaw<{ key: string; visitors: number }[]>`
      SELECT COALESCE(channel, 'Direct') AS key, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "MarketingVisit"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1`;
    for (const row of unique) ensure(row.key).visitors += row.visitors;
  } else {
    const unique = await prisma.$queryRaw<{ key: string; visitors: number }[]>`
      SELECT COALESCE(NULLIF(campaign, ''), '(none)') AS key, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "MarketingVisit"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1`;
    for (const row of unique) ensure(row.key).visitors += row.visitors;
  }
  for (const user of users) {
    if (!user.email || isInternalEmail(user.email)) continue;
    ensure(touchOf(user, dim, touch)).signups += 1;
  }

  const checkoutEmails = new Set<string>();
  for (const payment of payments) {
    if (isInternalEmail(payment.email)) continue;
    const key = touchOf(payment, dim, touch);
    const row = ensure(key);
    if (payment.createdAt >= from && payment.createdAt < to) {
      const ident = (payment.email || "").toLowerCase() || `anon:${key}:${payment.createdAt.toISOString()}`;
      // count checkouts as orders started, not distinct emails (a person can start two checkouts)
      row.checkouts += 1;
      checkoutEmails.add(ident);
    }
    const paidAt = payment.paidAt || payment.createdAt;
    if (payment.status === "paid" && payment.gateway === "cashfree" && payment.gatewayConfirmedAt && paidAt >= from && paidAt < to) {
      row.sales += 1;
      row.revenue += payment.amountInr;
    }
    if (payment.status === "paid" && payment.gateway === "manual" && paidAt >= from && paidAt < to) {
      row.manualSales += 1;
      row.manualRevenue += payment.amountInr;
    }
  }

  return [...map.entries()]
    .map(([key, row]) => ({
      key,
      ...row,
      conversion: row.checkouts ? row.sales / row.checkouts : null,
    }))
    .filter((r) => r.visitors || r.signups || r.checkouts || r.sales || r.manualSales)
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || b.checkouts - a.checkouts || b.visitors - a.visitors || a.key.localeCompare(b.key));
}

export function istRange(fromRaw?: string, toRaw?: string) {
  const ok = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const defFrom = new Date(Date.now() + 5.5 * 3600e3 - 29 * 864e5).toISOString().slice(0, 10);
  const fromDay = ok(fromRaw) || defFrom;
  const toDay = ok(toRaw) || today;
  const from = new Date(`${fromDay}T00:00:00+05:30`);
  const to = new Date(new Date(`${toDay}T00:00:00+05:30`).getTime() + 864e5);
  return { from, to, fromDay, toDay };
}

export function readDim(v?: string): Dim {
  return v === "channel" || v === "campaign" ? v : "source";
}
export function readTouch(v?: string): TouchKind {
  return v === "first" ? "first" : "last";
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = c == null ? "" : String(c);
          const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
          return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(","),
    )
    .join("\n");
}
