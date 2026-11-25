import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/affiliates/core";

export const BLOCKS = [
  { key: "clicks", label: "Clicks" },
  { key: "signups", label: "Signups" },
  { key: "sales", label: "Sales & conversion" },
  { key: "commission", label: "Commission totals" },
  { key: "chart", label: "Daily chart" },
  { key: "feed", label: "Recent sales feed" },
  { key: "content", label: "Content analytics" },
  { key: "payouts", label: "Payout history" },
] as const;
export type BlockKey = (typeof BLOCKS)[number]["key"];
const KEYS = new Set<string>(BLOCKS.map((b) => b.key));

export function parseHidden(value: string | null | undefined) {
  return new Set((value || "").split(",").map((s) => s.trim()).filter((s) => KEYS.has(s))) as Set<BlockKey>;
}

export function serializeHidden(input: unknown) {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  return Array.from(new Set(list.map((s) => String(s).trim()).filter((s) => KEYS.has(s)))).join(",");
}

/** "Deepak Sharma" -> "Deepak ****"; single name stays; nothing -> masked email. */
export function maskedName(name: string | null | undefined, email: string | null | undefined) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return maskEmail(email);
  const first = parts[0].slice(0, 1).toUpperCase() + parts[0].slice(1, 30);
  return parts.length > 1 ? `${first} ****` : first;
}

export type FeedItem = { id: string; when: Date; who: string; city: string | null; sale: string; commission: string; tone: "ok" | "wait" | "bad" };

export async function salesFeed(affiliateId: string, take = 20): Promise<FeedItem[]> {
  const rows = await prisma.affiliateCommission.findMany({
    where: { affiliateId, kind: "sale" },
    orderBy: { createdAt: "desc" },
    take,
  });
  const ids = rows.map((r) => r.paymentId).filter((id): id is string => Boolean(id));
  const payments = await prisma.payment.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true, status: true, paidAt: true, createdAt: true, user: { select: { name: true, city: true } } },
  });
  const byId = new Map(payments.map((p) => [p.id, p]));
  return rows.map((row) => {
    const p = row.paymentId ? byId.get(row.paymentId) : undefined;
    const amount = `₹${new Intl.NumberFormat("en-IN").format(row.amountInr)}`;
    const refunded = p ? p.status === "refunded" : true;
    let commission: string;
    let tone: FeedItem["tone"];
    if (row.status === "void") {
      commission = row.voidReason === "Self-referral" ? "not eligible (own purchase)" : `your commission reversed ${amount}`;
      tone = "bad";
    } else if (row.status === "approved" || row.status === "paid") {
      commission = `your commission confirmed ${amount}`;
      tone = "ok";
    } else {
      commission = `your commission pending ${amount}`;
      tone = "wait";
    }
    return {
      id: row.id,
      when: p?.paidAt || row.createdAt,
      who: maskedName(p?.user?.name || p?.name, p?.email),
      city: p?.user?.city || null,
      sale: refunded ? "Sale refunded" : "Sale completed",
      commission,
      tone,
    };
  });
}

export async function payoutHistory(affiliateId: string) {
  const rows = await prisma.affiliateCommission.findMany({
    where: { affiliateId, status: "paid" },
    orderBy: { paidAt: "desc" },
    select: { amountInr: true, paidAt: true, payoutRef: true },
  });
  const groups = new Map<string, { paidAt: Date | null; ref: string; total: number; entries: number }>();
  for (const row of rows) {
    const key = `${row.payoutRef || "-"}|${row.paidAt?.toISOString().slice(0, 10) || ""}`;
    const g = groups.get(key) || { paidAt: row.paidAt, ref: row.payoutRef || "—", total: 0, entries: 0 };
    g.total += row.amountInr;
    g.entries += 1;
    groups.set(key, g);
  }
  return Array.from(groups.values());
}

export async function postsWithStats(affiliateId: string) {
  const posts = await prisma.affiliatePost.findMany({ where: { affiliateId }, orderBy: { createdAt: "desc" } });
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p.id);
  const [clicks, sales] = await Promise.all([
    prisma.affiliateClick.groupBy({ by: ["postId"], where: { postId: { in: ids } }, _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["refPostId"], where: { refPostId: { in: ids }, status: "paid", isTest: false }, _count: { _all: true }, _sum: { amountInr: true } }),
  ]);
  const c = new Map(clicks.map((r) => [r.postId, r._count._all]));
  const s = new Map(sales.map((r) => [r.refPostId, { n: r._count._all, revenue: r._sum.amountInr || 0 }]));
  return posts.map((p) => ({ ...p, clicks: c.get(p.id) || 0, sales: s.get(p.id)?.n || 0, revenue: s.get(p.id)?.revenue || 0 }));
}

export function postTotals(posts: { views: number; likes: number; comments: number; shares: number; clicks: number; sales: number }[]) {
  return posts.reduce(
    (t, p) => ({ views: t.views + p.views, likes: t.likes + p.likes, comments: t.comments + p.comments, shares: t.shares + p.shares, clicks: t.clicks + p.clicks, sales: t.sales + p.sales }),
    { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, sales: 0 },
  );
}
