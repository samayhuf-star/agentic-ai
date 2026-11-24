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
