import { cashfreeTarget } from "@/lib/payments/gateways";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { prisma } from "@/lib/prisma";

export async function confirmPendingCashfreeOrder(orderId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment || payment.gateway !== "cashfree") return payment;
  if (payment.status === "paid" || payment.status === "paid_unassigned") return payment;
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) return payment;

  const cashfree = cashfreeTarget();
  let body: { order_status?: string; order_amount?: number; customer_details?: { customer_phone?: string } };
  try {
    const response = await fetch(`${cashfree.apiBase}/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        "x-api-version": "2025-01-01",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
      },
    });
    if (!response.ok) return payment;
    body = (await response.json()) as typeof body;
  } catch (error) {
    console.error(error);
    return payment;
  }

  const orderStatus = String(body.order_status || "").toUpperCase();
  if (orderStatus === "EXPIRED" || orderStatus === "CANCELLED" || orderStatus === "TERMINATED" || orderStatus === "FAILED") {
    await fulfillPayment("cashfree", {
      orderId,
      status: "failed",
      amountInr: body.order_amount != null ? Math.round(Number(body.order_amount)) : payment.amountInr,
      phone: body.customer_details?.customer_phone || payment.phone,
      gatewayPaymentId: null,
      raw: body,
    });
    return prisma.payment.findUnique({ where: { id: orderId } });
  }
  if (orderStatus !== "PAID") return payment;
  await fulfillPayment("cashfree", {
    orderId,
    status: "paid",
    amountInr: body.order_amount != null ? Math.round(Number(body.order_amount)) : payment.amountInr,
    phone: body.customer_details?.customer_phone || null,
    gatewayPaymentId: null,
    raw: body,
  });
  return prisma.payment.findUnique({ where: { id: orderId } });
}
