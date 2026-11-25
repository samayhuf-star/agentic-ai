import { cashfreeTarget, gatewayHasKeys } from "@/lib/payments/gateways";
import { prisma } from "@/lib/prisma";

type ReconRow = {
  event_details?: { event_type?: string; event_status?: string; event_amount?: number; event_time?: string };
  order_details?: { order_id?: string; order_amount?: number };
};

export type CfOrder = { orderId: string; paid: boolean; refunded: boolean; amount: number | null; lastStatus: string; at: string | null };

/** Cashfree's own ledger (POST /pg/recon) for a window, grouped by order id. Server-side only. */
export async function cashfreeLedger(from: Date, to: Date): Promise<{ ok: true; orders: Map<string, CfOrder> } | { ok: false; error: string }> {
  if (!gatewayHasKeys("cashfree")) return { ok: false, error: "CASHFREE_APP_ID / CASHFREE_SECRET_KEY are not set on the server." };
  const { apiBase } = cashfreeTarget();
  const headers = {
    "x-api-version": "2025-01-01",
    "x-client-id": process.env.CASHFREE_APP_ID!,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
    "content-type": "application/json",
  };
  const iso = (d: Date) => d.toISOString().replace(/\.\d+Z$/, "Z");
  const orders = new Map<string, CfOrder>();
  let cursor: string | null = null;
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`${apiBase}/recon`, {
      method: "POST",
      headers,
      body: JSON.stringify({ pagination: { limit: 100, cursor }, filters: { start_date: iso(from), end_date: iso(to) } }),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `Cashfree recon returned ${res.status}.` };
    const body = (await res.json()) as { data?: ReconRow[]; cursor?: string | null };
    for (const row of body.data || []) {
      const id = row.order_details?.order_id;
      if (!id) continue;
      const type = (row.event_details?.event_type || "").toUpperCase();
      const status = (row.event_details?.event_status || "").toUpperCase();
      const o = orders.get(id) || { orderId: id, paid: false, refunded: false, amount: row.order_details?.order_amount ?? null, lastStatus: "", at: null };
      if (type === "PAYMENT" && status === "SUCCESS") {
        o.paid = true;
        o.amount = row.event_details?.event_amount ?? o.amount;
      }
      if (type === "REFUND" && status === "SUCCESS") o.refunded = true;
      if (!o.at || (row.event_details?.event_time || "") > o.at) {
        o.at = row.event_details?.event_time || o.at;
        o.lastStatus = `${type} ${status}`.trim();
      }
      orders.set(id, o);
    }
    cursor = body.cursor || null;
    if (!cursor || (body.data || []).length === 0) break;
  }
  return { ok: true, orders };
}

export type ReconLine = {
  orderId: string;
  cf: CfOrder | null;
  ours: { status: string; amountInr: number; confirmed: boolean; isTest: boolean; email: string | null } | null;
  flag: "ok" | "missing_here" | "not_paid_here" | "not_confirmed" | "paid_here_not_cashfree" | "amount" | "refund" | "open";
};

export async function reconcile(from: Date, to: Date) {
  const ledger = await cashfreeLedger(from, to);
  const ours = await prisma.payment.findMany({
    where: { gateway: "cashfree", createdAt: { gte: new Date(from.getTime() - 864e5), lt: to } },
    select: { id: true, status: true, amountInr: true, gatewayConfirmedAt: true, isTest: true, email: true },
  });
  if (!ledger.ok) return { ok: false as const, error: ledger.error, lines: [] as ReconLine[] };
  const byId = new Map(ours.map((p) => [p.id, p]));
  const ids = new Set([...ledger.orders.keys(), ...ours.map((p) => p.id)]);
  const lines: ReconLine[] = [];
  for (const id of ids) {
    const cf = ledger.orders.get(id) || null;
    const p = byId.get(id);
    const o = p ? { status: p.status, amountInr: p.amountInr, confirmed: Boolean(p.gatewayConfirmedAt), isTest: p.isTest, email: p.email } : null;
    let flag: ReconLine["flag"] = "ok";
    if (cf?.paid && !o) flag = "missing_here";
    else if (cf?.refunded && o && o.status !== "refunded") flag = "refund";
    else if (cf?.paid && o && o.status !== "paid" && o.status !== "refunded") flag = "not_paid_here";
    else if (cf?.paid && o && !o.confirmed && !o.isTest) flag = "not_confirmed";
    else if (cf?.paid && o && cf.amount != null && Math.round(cf.amount) !== o.amountInr) flag = "amount";
    else if (!cf?.paid && o && o.status === "paid" && !o.isTest) flag = "paid_here_not_cashfree";
    else if (!cf?.paid) flag = "open";
    lines.push({ orderId: id, cf, ours: o, flag });
  }
  const rank = { missing_here: 0, not_paid_here: 1, refund: 2, paid_here_not_cashfree: 3, amount: 4, not_confirmed: 5, ok: 6, open: 7 } as const;
  lines.sort((a, b) => rank[a.flag] - rank[b.flag] || (b.cf?.at || "").localeCompare(a.cf?.at || ""));
  return { ok: true as const, lines };
}
