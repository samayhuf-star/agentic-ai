import { Prisma } from "@prisma/client";
import { privilegedEmails } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { daysInRange, fixedWindows, type StatsRange } from "@/lib/admin/range";
import { istDayExpr, istDayKey, istDayStart, orderInstant } from "@/lib/ist";

export type DayPoint = { day: string; revenue: number; orders: number };
export type SalesSnapshot = {
  windows: { label: string; revenue: number; orders: number; refunded: number; net: number }[];
  rangePaid: number;
  rangeOrders: number;
  rangeRefunded: number;
  rangeNet: number;
  aov: number;
  pending: { id: string; createdAt: Date; amountInr: number; email: string | null; age: string }[];
  pendingCount: number;
  failedCount: number;
  days: DayPoint[];
};

function live(includeTest: boolean) {
  return includeTest ? Prisma.sql`` : Prisma.sql`AND "isTest" = false`;
}

function since(column: string, from: Date | null, to: Date) {
  const expr = () => Prisma.raw(column);
  if (!from) return Prisma.sql`${expr()} <= ${to}`;
  return Prisma.sql`${expr()} >= ${from} AND ${expr()} <= ${to}`;
}

function ageOf(createdAt: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (60 * 60 * 1000)));
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const paidAtExpr = `COALESCE("paidAt", "createdAt")`;

function privilegedSqlList() {
  const emails = privilegedEmails();
  if (emails.length === 0) return Prisma.sql`'__no_privileged__'`;
  return Prisma.join(emails);
}

function paymentNotPrivileged(alias: string) {
  const list = privilegedSqlList();
  const email = Prisma.raw(`${alias}.email`);
  const userId = Prisma.raw(`${alias}."userId"`);
  return Prisma.sql`AND lower(COALESCE(${email}, '')) NOT IN (${list}) AND NOT EXISTS (SELECT 1 FROM "User" pu WHERE pu.id = ${userId} AND lower(COALESCE(pu.email, '')) IN (${list}))`;
}

export async function overviewSignupCount() {
  const list = privilegedSqlList();
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "User" u
    WHERE u."compAccess" = false
      AND (u.email IS NULL OR lower(u.email) NOT IN (${list}))
      AND (
        NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."userId" = u.id AND p.status = 'paid')
        OR EXISTS (SELECT 1 FROM "Payment" p WHERE p."userId" = u.id AND p.status = 'paid' AND p."isTest" = false)
      )
  `;
  return rows[0]?.count || 0;
}

async function paidGross(from: Date | null, to: Date, includeTest: boolean) {
  const rows = await prisma.$queryRaw<Array<{ revenue: number; orders: number; kept: number }>>`
    SELECT COALESCE(SUM("amountInr"), 0)::int AS revenue,
           COUNT(*)::int AS orders,
           COALESCE(SUM("amountInr") FILTER (WHERE status = 'paid'), 0)::int AS kept
    FROM "Payment"
    WHERE status IN ('paid', 'refunded')
      AND ${since(paidAtExpr, from, to)}
      ${live(includeTest)}
  `;
  const row = rows[0] || { revenue: 0, orders: 0, kept: 0 };
  return { revenue: Number(row.revenue), orders: Number(row.orders), kept: Number(row.kept) };
}

async function refundedTotal(from: Date | null, to: Date, includeTest: boolean) {
  const rows = await prisma.$queryRaw<Array<{ revenue: number }>>`
    SELECT COALESCE(SUM("amountInr"), 0)::int AS revenue
    FROM "Payment"
    WHERE status = 'refunded'
      AND ${since('"refundedAt"', from, to)}
      ${live(includeTest)}
  `;
  return Number(rows[0]?.revenue || 0);
}

function chartSeries(points: DayPoint[], from: Date | null, to: Date) {
  if (points.length === 0) return [];
  const end = istDayStart(to);
  const first = istDayStart(new Date(`${points[0].day}T12:00:00Z`));
  let start = from ? istDayStart(from) : first;
  const span = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (span > 90) start = new Date(end.getTime() - 89 * 24 * 60 * 60 * 1000);
  const byDay = new Map(points.map((point) => [point.day, point]));
  return daysInRange(start, end).map((day) => byDay.get(istDayKey(day)) || { day: istDayKey(day), revenue: 0, orders: 0 });
}

export async function salesSnapshot(range: StatsRange): Promise<SalesSnapshot> {
  const windows = fixedWindows();
  const spans = [
    { label: "Today", from: windows.today as Date | null },
    { label: "7 days", from: windows.week },
    { label: "30 days", from: windows.month },
    { label: "All time", from: null },
  ];
  const windowRows = await Promise.all(
    spans.map(async (span) => {
      const paid = await paidGross(span.from, windows.now, range.includeTest);
      const refunded = await refundedTotal(span.from, windows.now, range.includeTest);
      return { label: span.label, revenue: paid.kept, orders: paid.orders, refunded, net: paid.kept - refunded };
    }),
  );
  const [paid, refunded, pendingRows, failedRows, dayRows] = await Promise.all([
    paidGross(range.from, range.to, range.includeTest),
    refundedTotal(range.from, range.to, range.includeTest),
    prisma.payment.findMany({
      where: {
        status: "pending",
        ...(range.includeTest ? {} : { isTest: false }),
        ...(range.from ? { createdAt: { gte: range.from, lte: range.to } } : { createdAt: { lte: range.to } }),
      },
      orderBy: { createdAt: "asc" },
      take: 40,
      select: { id: true, createdAt: true, amountInr: true, email: true },
    }),
    prisma.payment.count({
      where: {
        status: "failed",
        ...(range.includeTest ? {} : { isTest: false }),
        createdAt: range.from ? { gte: range.from, lte: range.to } : { lte: range.to },
      },
    }),
    prisma.$queryRaw<Array<{ day: string; revenue: number; orders: number }>>`
      SELECT ${Prisma.raw(istDayExpr(paidAtExpr))} AS day,
             COALESCE(SUM("amountInr"), 0)::int AS revenue,
             COUNT(*)::int AS orders
      FROM "Payment"
      WHERE status IN ('paid', 'refunded')
        AND ${since(paidAtExpr, range.from, range.to)}
        ${live(range.includeTest)}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);
  const days = chartSeries(
    dayRows.map((row) => ({ day: String(row.day).slice(0, 10), revenue: Number(row.revenue), orders: Number(row.orders) })),
    range.from,
    range.to,
  );
  return {
    windows: windowRows,
    rangePaid: paid.revenue,
    rangeOrders: paid.orders,
    rangeRefunded: refunded,
    rangeNet: paid.kept - refunded,
    aov: paid.orders ? Math.round(paid.revenue / paid.orders) : 0,
    pending: pendingRows.map((row) => ({ ...row, age: ageOf(row.createdAt) })),
    pendingCount: pendingRows.length,
    failedCount: failedRows,
    days,
  };
}

const customerSql = (includeTest: boolean) =>
  includeTest
    ? Prisma.sql`TRUE`
    : Prisma.sql`NOT (
        EXISTS (SELECT 1 FROM "Payment" tp WHERE tp."userId" = u.id AND tp."isTest" = true AND tp.status IN ('paid', 'refunded'))
        AND NOT EXISTS (SELECT 1 FROM "Payment" lp WHERE lp."userId" = u.id AND lp."isTest" = false AND lp.status IN ('paid', 'refunded'))
      )`;

export async function customerSnapshot(range: StatsRange) {
  const hidden = privilegedEmails();
  const created = () => (range.from ? Prisma.sql`u."createdAt" >= ${range.from} AND u."createdAt" <= ${range.to}` : Prisma.sql`u."createdAt" <= ${range.to}`);
  const onboarded = () => (range.from ? Prisma.sql`u."onboardedAt" >= ${range.from} AND u."onboardedAt" <= ${range.to}` : Prisma.sql`u."onboardedAt" <= ${range.to}`);
  const realUser = () => {
    const hiddenList = hidden.length ? Prisma.join(hidden) : Prisma.sql`'__no_privileged__'`;
    return Prisma.sql`u."compAccess" = false AND (u.email IS NULL OR lower(u.email) NOT IN (${hiddenList})) AND ${customerSql(range.includeTest)}`;
  };
  const [signups, paid, onboardedCount, keys, firstChat, active7, active30] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "User" u WHERE ${created()} AND ${realUser()}`,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT p."userId")::int AS count
      FROM "Payment" p
      JOIN "User" u ON u.id = p."userId"
      WHERE p.status = 'paid'
        AND ${since('COALESCE(p."paidAt", p."createdAt")', range.from, range.to)}
        ${range.includeTest ? Prisma.sql`` : Prisma.sql`AND p."isTest" = false`}
        AND ${realUser()}
    `,
    prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "User" u WHERE u."onboardedAt" IS NOT NULL AND ${onboarded()} AND ${realUser()}`,
    prisma.$queryRaw<Array<{ provider: string; count: number }>>`
      SELECT k.provider, COUNT(*)::int AS count
      FROM "UserAiKey" k
      JOIN "User" u ON u.id = k."userId"
      WHERE ${since('k."createdAt"', range.from, range.to)}
        AND ${realUser()}
      GROUP BY k.provider
      ORDER BY k.provider
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT m."userId", MIN(m."createdAt") AS first_at
        FROM "Message" m
        JOIN "User" u ON u.id = m."userId"
        WHERE m.role = 'user' AND ${realUser()}
        GROUP BY m."userId"
      ) firsts
      WHERE ${since("first_at", range.from, range.to)}
    `,
    activeCustomers(7, range.includeTest, hidden),
    activeCustomers(30, range.includeTest, hidden),
  ]);
  return {
    signups: signups[0]?.count || 0,
    paid: paid[0]?.count || 0,
    onboarded: onboardedCount[0]?.count || 0,
    keys,
    firstChat: firstChat[0]?.count || 0,
    active7: active7,
    active30: active30,
  };
}

async function activeCustomers(days: number, includeTest: boolean, hidden: string[]) {
  const sinceAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const hiddenList = hidden.length ? Prisma.join(hidden) : Prisma.sql`'__no_privileged__'`;
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "User" u
    WHERE u."compAccess" = false
      AND (u.email IS NULL OR lower(u.email) NOT IN (${hiddenList}))
      AND ${customerSql(includeTest)}
      AND (
        EXISTS (SELECT 1 FROM "Message" m WHERE m."userId" = u.id AND m."createdAt" >= ${sinceAt})
        OR EXISTS (SELECT 1 FROM "Session" s WHERE s."userId" = u.id AND s."createdAt" >= ${sinceAt} AND s."isAdmin" = false)
      )
  `;
  return rows[0]?.count || 0;
}

export async function funnelSnapshot(range: StatsRange) {
  const created = since('p."createdAt"', range.from, range.to);
  const paidInWindow = since('COALESCE(p."paidAt", p."createdAt")', range.from, range.to);
  const hideSubmitted = paymentNotPrivileged("p");
  const hidePaid = paymentNotPrivileged("p");
  const [rows, paidRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{ submitted: number; paid: number; coded: number; loggedIn: number; onboarded: number; keyed: number; chatted: number }>
    >`
    SELECT
      COUNT(*)::int AS submitted,
      0::int AS paid,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "EmailLog" e
        WHERE lower(e."toEmail") = lower(p.email)
          AND e.subject ILIKE '%code%'
          AND e."createdAt" >= p."createdAt"
      ))::int AS coded,
      COUNT(*) FILTER (WHERE p."userId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "Session" s WHERE s."userId" = p."userId" AND s."isAdmin" = false
      ))::int AS "loggedIn",
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "User" u WHERE u.id = p."userId" AND u."onboardedAt" IS NOT NULL
      ))::int AS onboarded,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "UserAiKey" k WHERE k."userId" = p."userId"
      ))::int AS keyed,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "Message" m WHERE m."userId" = p."userId" AND m.role = 'user'
      ))::int AS chatted
    FROM "Payment" p
    WHERE ${created}
      ${live(range.includeTest)}
      ${hideSubmitted}
  `,
    prisma.$queryRaw<Array<{ orders: number }>>`
      SELECT COUNT(*)::int AS orders
      FROM "Payment" p
      WHERE p.status IN ('paid', 'refunded')
        AND ${paidInWindow}
        ${live(range.includeTest)}
        ${hidePaid}
    `,
  ]);
  const row = rows[0] || { submitted: 0, paid: 0, coded: 0, loggedIn: 0, onboarded: 0, keyed: 0, chatted: 0 };
  row.paid = Number(paidRows[0]?.orders || 0);
  return [
    { label: "Landing page", count: null as number | null, note: "Tracking starts in Phase 1" },
    { label: "Buy click", count: null, note: "Tracking starts in Phase 1" },
    { label: "Checkout submitted", count: row.submitted, note: "" },
    { label: "Paid", count: row.paid, note: "" },
    { label: "Code sent", count: row.coded, note: "From the email log" },
    { label: "First login", count: row.loggedIn, note: "" },
    { label: "Onboarding done", count: row.onboarded, note: "" },
    { label: "AI key connected", count: row.keyed, note: "" },
    { label: "First chat", count: row.chatted, note: "" },
  ];
}

function orderWhere(range: StatsRange, status: string): Prisma.PaymentWhereInput {
  const time = range.from ? { gte: range.from, lte: range.to } : { lte: range.to };
  const liveOnly = range.includeTest ? {} : { isTest: false };
  const paidTime: Prisma.PaymentWhereInput = { OR: [{ paidAt: time }, { AND: [{ paidAt: null }, { createdAt: time }] }] };
  const createdTime: Prisma.PaymentWhereInput = { createdAt: time };
  if (status === "paid" || status === "refunded") return { ...liveOnly, status, ...paidTime };
  if (status === "pending" || status === "failed") return { ...liveOnly, status, ...createdTime };
  return {
    ...liveOnly,
    OR: [
      { status: { in: ["paid", "refunded"] }, ...paidTime },
      { NOT: { status: { in: ["paid", "refunded"] } }, ...createdTime },
    ],
  };
}

export async function orderRows(range: StatsRange, status: string) {
  const where = orderWhere(range, status);
  const [found, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        paidAt: true,
        status: true,
        isTest: true,
        amountInr: true,
        email: true,
        gateway: true,
        refundedAt: true,
        refundedBy: true,
      },
    }),
    prisma.payment.count({ where }),
  ]);
  const rows = found
    .map((row) => ({ ...row, shownAt: orderInstant(row) }))
    .sort((a, b) => b.shownAt.getTime() - a.shownAt.getTime());
  return { rows, total };
}
