import { Prisma } from "@prisma/client";
import { adminEmails } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { fixedWindows, type StatsRange } from "@/lib/admin/range";

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
  if (!from) return Prisma.sql`${Prisma.raw(column)} <= ${to}`;
  return Prisma.sql`${Prisma.raw(column)} >= ${from} AND ${Prisma.raw(column)} <= ${to}`;
}

function ageOf(createdAt: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (60 * 60 * 1000)));
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

async function money(status: "paid" | "refunded", column: "paidAt" | "refundedAt", from: Date | null, to: Date, includeTest: boolean) {
  const rows = await prisma.$queryRaw<Array<{ revenue: number; orders: number }>>`
    SELECT COALESCE(SUM("amountInr"), 0)::int AS revenue, COUNT(*)::int AS orders
    FROM "Payment"
    WHERE status = ${status}
      AND ${since(`"${column}"`, from, to)}
      ${live(includeTest)}
  `;
  return rows[0] || { revenue: 0, orders: 0 };
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
      const paid = await money("paid", "paidAt", span.from, windows.now, range.includeTest);
      const refunded = await money("refunded", "refundedAt", span.from, windows.now, range.includeTest);
      return { label: span.label, revenue: paid.revenue, orders: paid.orders, refunded: refunded.revenue, net: paid.revenue - refunded.revenue };
    }),
  );
  const [paid, refunded, pendingRows, failedRows, dayRows] = await Promise.all([
    money("paid", "paidAt", range.from, range.to, range.includeTest),
    money("refunded", "refundedAt", range.from, range.to, range.includeTest),
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
    prisma.$queryRaw<Array<{ day: Date; revenue: number; orders: number }>>`
      SELECT (timezone('Asia/Kolkata', "paidAt"))::date AS day,
             COALESCE(SUM("amountInr"), 0)::int AS revenue,
             COUNT(*)::int AS orders
      FROM "Payment"
      WHERE status IN ('paid', 'refunded')
        AND ${since('"paidAt"', range.from, range.to)}
        ${live(range.includeTest)}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);
  return {
    windows: windowRows,
    rangePaid: paid.revenue,
    rangeOrders: paid.orders,
    rangeRefunded: refunded.revenue,
    rangeNet: paid.revenue - refunded.revenue,
    aov: paid.orders ? Math.round(paid.revenue / paid.orders) : 0,
    pending: pendingRows.map((row) => ({ ...row, age: ageOf(row.createdAt) })),
    pendingCount: pendingRows.length,
    failedCount: failedRows,
    days: dayRows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      revenue: row.revenue,
      orders: row.orders,
    })),
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
  const admins = adminEmails();
  const created = () => (range.from ? Prisma.sql`u."createdAt" >= ${range.from} AND u."createdAt" <= ${range.to}` : Prisma.sql`u."createdAt" <= ${range.to}`);
  const onboarded = () => (range.from ? Prisma.sql`u."onboardedAt" >= ${range.from} AND u."onboardedAt" <= ${range.to}` : Prisma.sql`u."onboardedAt" <= ${range.to}`);
  const realUser = () => {
    const adminList = admins.length ? Prisma.join(admins) : Prisma.sql`'__no_admin__'`;
    return Prisma.sql`u."compAccess" = false AND (u.email IS NULL OR lower(u.email) NOT IN (${adminList})) AND ${customerSql(range.includeTest)}`;
  };
  const [signups, paid, onboardedCount, keys, firstChat, active7, active30] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "User" u WHERE ${created()} AND ${realUser()}`,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT p."userId")::int AS count
      FROM "Payment" p
      JOIN "User" u ON u.id = p."userId"
      WHERE p.status = 'paid'
        AND ${since('p."paidAt"', range.from, range.to)}
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
    activeCustomers(7, range.includeTest, admins),
    activeCustomers(30, range.includeTest, admins),
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

async function activeCustomers(days: number, includeTest: boolean, admins: string[]) {
  const sinceAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const adminList = admins.length ? Prisma.join(admins) : Prisma.sql`'__no_admin__'`;
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "User" u
    WHERE u."compAccess" = false
      AND (u.email IS NULL OR lower(u.email) NOT IN (${adminList}))
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
  const rows = await prisma.$queryRaw<
    Array<{ submitted: number; paid: number; coded: number; loggedIn: number; onboarded: number; keyed: number; chatted: number }>
  >`
    SELECT
      COUNT(*)::int AS submitted,
      COUNT(*) FILTER (WHERE p.status IN ('paid', 'refunded'))::int AS paid,
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
  `;
  const row = rows[0] || { submitted: 0, paid: 0, coded: 0, loggedIn: 0, onboarded: 0, keyed: 0, chatted: 0 };
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

export async function orderRows(range: StatsRange, status: string) {
  const where = {
    ...(range.includeTest ? {} : { isTest: false }),
    ...(status && status !== "all" ? { status } : {}),
    createdAt: range.from ? { gte: range.from, lte: range.to } : { lte: range.to },
  };
  const [rows, total] = await Promise.all([
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
  return { rows, total };
}
