import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Dim = "channel" | "source" | "campaign";
export type TouchKind = "first" | "last";
export type SourceRow = { key: string; sales: number; revenue: number; manualSales: number; manualRevenue: number; signups: number };

function keyExpr(dim: Dim, touch: TouchKind) {
  const col = touch === "first" ? '"mktFirst"' : '"mktLast"';
  if (dim === "channel") return Prisma.raw(`COALESCE(${touch === "first" ? '"channelFirst"' : '"channelLast"'}, 'Direct')`);
  if (dim === "source") return Prisma.raw(`COALESCE(NULLIF(${col}->>'s', ''), NULLIF(split_part(${col}->>'r', '/', 1), ''), '(direct)')`);
  return Prisma.raw(`COALESCE(NULLIF(${col}->>'c', ''), '(none)')`);
}

/** Sales = Cashfree-confirmed only. Manual (admin-recorded) shown in its own columns. Signups = distinct emails that started checkout. */
export async function salesBySource(from: Date, to: Date, dim: Dim, touch: TouchKind): Promise<SourceRow[]> {
  const key = keyExpr(dim, touch);
  const rows = await prisma.$queryRaw<{ key: string; sales: number; revenue: number; manual_sales: number; manual_revenue: number; signups: number }[]>`
    SELECT ${key} AS key,
      COUNT(*) FILTER (WHERE status = 'paid' AND gateway = 'cashfree' AND "gatewayConfirmedAt" IS NOT NULL AND COALESCE("paidAt", "createdAt") >= ${from} AND COALESCE("paidAt", "createdAt") < ${to})::int AS sales,
      COALESCE(SUM("amountInr") FILTER (WHERE status = 'paid' AND gateway = 'cashfree' AND "gatewayConfirmedAt" IS NOT NULL AND COALESCE("paidAt", "createdAt") >= ${from} AND COALESCE("paidAt", "createdAt") < ${to}), 0)::int AS revenue,
      COUNT(*) FILTER (WHERE status = 'paid' AND gateway = 'manual' AND COALESCE("paidAt", "createdAt") >= ${from} AND COALESCE("paidAt", "createdAt") < ${to})::int AS manual_sales,
      COALESCE(SUM("amountInr") FILTER (WHERE status = 'paid' AND gateway = 'manual' AND COALESCE("paidAt", "createdAt") >= ${from} AND COALESCE("paidAt", "createdAt") < ${to}), 0)::int AS manual_revenue,
      COUNT(DISTINCT LOWER(email)) FILTER (WHERE gateway <> 'manual' AND "createdAt" >= ${from} AND "createdAt" < ${to})::int AS signups
    FROM "Payment"
    WHERE "isTest" = false AND ("createdAt" >= ${from} OR "paidAt" >= ${from})
    GROUP BY 1
    ORDER BY 3 DESC, 2 DESC, 6 DESC`;
  return rows
    .map((r) => ({ key: r.key, sales: r.sales, revenue: r.revenue, manualSales: r.manual_sales, manualRevenue: r.manual_revenue, signups: r.signups }))
    .filter((r) => r.sales || r.manualSales || r.signups);
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
  return v === "source" || v === "campaign" ? v : "channel";
}
export function readTouch(v?: string): TouchKind {
  return v === "first" ? "first" : "last";
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((r) => r.map((c) => {
    const s = c == null ? "" : String(c);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }).join(",")).join("\n");
}
