import { appOrigin } from "@/lib/config";
import { cashfreeStartUrl, cashfreeTarget, gatewayHasKeys } from "@/lib/payments/gateways";
import { startCheckoutFor } from "@/lib/payments/checkout";
import { indianMobile } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

type CashfreeOrder = { order_status?: string; order_expiry_time?: string; payment_session_id?: string };

async function activeSession(orderId: string): Promise<string | null> {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) return null;
  const response = await fetch(`${cashfreeTarget().apiBase}/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      "x-api-version": "2025-01-01",
      "x-client-id": process.env.CASHFREE_APP_ID,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const order = (await response.json()) as CashfreeOrder;
  if (order.order_status !== "ACTIVE" || !order.payment_session_id) return null;
  // Need a few minutes left so the buyer can finish.
  const expiry = order.order_expiry_time ? Date.parse(order.order_expiry_time) : NaN;
  if (Number.isFinite(expiry) && expiry - Date.now() < 3 * 60 * 1000) return null;
  return order.payment_session_id;
}

/** "Pay again" for an unpaid order: reuse the Cashfree session if still open, else a new order with the saved details. */
export async function payAgain(request: Request, orderId: string): Promise<{ redirect: string }> {
  const origin = appOrigin(request);
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment) return { redirect: `${origin}/checkout` };
  if (payment.status === "paid" || payment.status === "paid_unassigned")
    return { redirect: `${origin}/payment/success?order_id=${encodeURIComponent(orderId)}` };
  if (payment.gateway === "cashfree" && gatewayHasKeys("cashfree")) {
    const session = await activeSession(orderId).catch(() => null);
    if (session) return { redirect: cashfreeStartUrl(origin, session) };
  }
  const mobile = indianMobile(payment.phone);
  if (!payment.name || !payment.email || !mobile.ok) return { redirect: `${origin}/checkout` };
  const result = await startCheckoutFor(
    request,
    { name: payment.name, email: payment.email, phone: mobile.e164, digits: mobile.digits },
    { retryOf: orderId },
  );
  return { redirect: result.redirect || `${origin}/checkout` };
}
