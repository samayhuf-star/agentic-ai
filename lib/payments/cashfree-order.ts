import { cashfreeTarget } from "@/lib/payments/gateways";

export type CashfreeOrderView = {
  order_status?: string;
  order_amount?: number;
  order_currency?: string;
  customer_details?: { customer_phone?: string; customer_email?: string; customer_name?: string };
};

export async function fetchCashfreeOrder(orderId: string): Promise<CashfreeOrderView | null> {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) return null;
  const cashfree = cashfreeTarget();
  const headers = {
    "x-api-version": "2025-01-01",
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
  };
  const response = await fetch(`${cashfree.apiBase}/orders/${encodeURIComponent(orderId)}`, { headers });
  if (!response.ok) return null;
  const body = (await response.json()) as CashfreeOrderView;
  const payments = await fetch(`${cashfree.apiBase}/orders/${encodeURIComponent(orderId)}/payments`, { headers });
  if (payments.ok) {
    const list = (await payments.json()) as Array<{ customer_details?: CashfreeOrderView["customer_details"] }>;
    const found = Array.isArray(list) ? list.find((item) => item.customer_details?.customer_phone || item.customer_details?.customer_email) : null;
    if (found?.customer_details) body.customer_details = { ...body.customer_details, ...found.customer_details };
  }
  return body;
}

export type CashfreeAttempt = {
  cfPaymentId: string | null;
  status: string;
  amountInr: number | null;
  method: string | null;
  message: string | null;
  error: string | null;
  time: Date | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function attemptTime(row: Record<string, unknown>) {
  const raw = text(row.payment_time || row.payment_completion_time || row.created_at);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function methodOf(row: Record<string, unknown>) {
  const group = text(row.payment_group);
  if (group) return group;
  const method = asRecord(row.payment_method);
  if (!method) return null;
  const key = Object.keys(method)[0];
  return key || null;
}

function errorOf(row: Record<string, unknown>) {
  const details = asRecord(row.error_details);
  return text(details?.error_description || details?.error_reason || details?.error_code || row.payment_message) || null;
}

export function attemptsFromCashfreePayload(payload: unknown): CashfreeAttempt[] {
  const list = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : [];
  return list.map((item) => {
    const row = asRecord(item) || {};
    const amount = row.payment_amount ?? row.order_amount;
    return {
      cfPaymentId: text(row.cf_payment_id || row.payment_id) || null,
      status: text(row.payment_status).toUpperCase() || "UNKNOWN",
      amountInr: amount != null && text(amount) ? Math.round(Number(amount)) : null,
      method: methodOf(row),
      message: text(row.payment_message) || null,
      error: errorOf(row),
      time: attemptTime(row),
    };
  });
}

/** Payment attempts for one Cashfree order (SUCCESS, USER_DROPPED, FAILED, …). */
export async function fetchCashfreeAttempts(orderId: string): Promise<CashfreeAttempt[]> {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) return [];
  const cashfree = cashfreeTarget();
  const headers = {
    "x-api-version": "2025-01-01",
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
  };
  const response = await fetch(`${cashfree.apiBase}/orders/${encodeURIComponent(orderId)}/payments`, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return [];
  const body = await response.json().catch(() => null);
  return attemptsFromCashfreePayload(body);
}
