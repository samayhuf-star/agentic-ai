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

export const SOURCE_STAGES = ["visitors", "signups", "checkouts", "sales", "revenue", "manual"] as const;
export type SourceStage = (typeof SOURCE_STAGES)[number];

export function sourceSlug(key: string) {
  return key.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

export function readStage(v?: string): SourceStage | null {
  return SOURCE_STAGES.includes(v as SourceStage) ? (v as SourceStage) : null;
}

export function sourceFilterHref(opts: { key: string; stage: SourceStage; from: string; to: string; dim: Dim; touch: TouchKind }) {
  const params = new URLSearchParams({
    source: sourceSlug(opts.key),
    stage: opts.stage,
    dim: opts.dim,
    touch: opts.touch,
    from: opts.from,
    to: opts.to,
  });
  return `/sup-admin/customers?${params}`;
}

export type SourcePerson = {
  id: string;
  href: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  time: Date;
  status: string;
  amountInr: number | null;
  source: string;
  detail: string | null;
};

const STAGE_LABEL: Record<SourceStage, string> = {
  visitors: "Visitors",
  signups: "Signups",
  checkouts: "Checkouts",
  sales: "Sales",
  revenue: "Revenue",
  manual: "Manual sales",
};

export function stageLabel(stage: SourceStage) {
  return STAGE_LABEL[stage];
}

/** Rows behind one Sources-table cell. Same exclusion rules as salesBySource (no staff/test). */
export async function listSourcePeople(opts: {
  from: Date;
  to: Date;
  dim: Dim;
  touch: TouchKind;
  slug: string;
  stage: SourceStage;
}): Promise<{ label: string; rows: SourcePerson[] }> {
  const wanted = opts.slug;
  const matches = (key: string) => sourceSlug(key) === wanted;
  const rows: SourcePerson[] = [];

  if (opts.stage === "visitors") {
    const visits = await prisma.marketingVisit.findMany({
      where: { createdAt: { gte: opts.from, lt: opts.to } },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });
    for (const visit of visits) {
      const key = opts.dim === "channel" ? visit.channel || "Direct" : opts.dim === "campaign" ? visit.campaign || "(none)" : visit.source;
      if (!matches(key)) continue;
      rows.push({
        id: visit.id,
        href: null,
        name: null,
        email: null,
        phone: null,
        time: visit.createdAt,
        status: "visit",
        amountInr: null,
        source: key,
        detail: `${visit.path} · visitor ${visit.visitorId.slice(0, 8)}`,
      });
    }
    return { label: keyLabel(opts, rows), rows };
  }

  if (opts.stage === "signups") {
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: opts.from, lt: opts.to } },
      orderBy: { createdAt: "desc" },
    });
    for (const user of users) {
      if (!user.email || isInternalEmail(user.email)) continue;
      const key = touchOf(user, opts.dim, opts.touch);
      if (!matches(key)) continue;
      rows.push({
        id: user.id,
        href: `/sup-admin/customers/${user.id}`,
        name: user.name || user.businessName,
        email: user.email,
        phone: user.phone,
        time: user.createdAt,
        status: user.suspendedAt ? "suspended" : user.compAccess ? "free access" : "signed up",
        amountInr: null,
        source: key,
        detail: null,
      });
    }
    return { label: keyLabel(opts, rows), rows };
  }

  const payments = await prisma.payment.findMany({
    where: { isTest: false, OR: [{ createdAt: { gte: opts.from, lt: opts.to } }, { paidAt: { gte: opts.from, lt: opts.to } }] },
    orderBy: { createdAt: "desc" },
  });
  for (const payment of payments) {
    if (isInternalEmail(payment.email)) continue;
    const key = touchOf(payment, opts.dim, opts.touch);
    if (!matches(key)) continue;
    const paidAt = payment.paidAt || payment.createdAt;
    const confirmed = payment.status === "paid" && payment.gateway === "cashfree" && payment.gatewayConfirmedAt;
    const manual = payment.status === "paid" && payment.gateway === "manual";
    let include = false;
    let time = payment.createdAt;
    let status = payment.status;
    if (opts.stage === "checkouts" && payment.createdAt >= opts.from && payment.createdAt < opts.to) {
      include = true;
    } else if ((opts.stage === "sales" || opts.stage === "revenue") && confirmed && paidAt >= opts.from && paidAt < opts.to) {
      include = true;
      time = paidAt;
      status = "paid";
    } else if (opts.stage === "manual" && manual && paidAt >= opts.from && paidAt < opts.to) {
      include = true;
      time = paidAt;
      status = "manual";
    }
    if (!include) continue;
    rows.push({
      id: payment.id,
      href: `/sup-admin/payments/${encodeURIComponent(payment.id)}`,
      name: payment.name,
      email: payment.email,
      phone: payment.phone,
      time,
      status,
      amountInr: payment.amountInr,
      source: key,
      detail: payment.id,
    });
  }
  return { label: keyLabel(opts, rows), rows };
}

function keyLabel(opts: { slug: string }, rows: SourcePerson[]) {
  return rows[0]?.source || opts.slug.replace(/_/g, " ");
}
