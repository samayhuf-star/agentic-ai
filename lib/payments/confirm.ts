import { cashfreeTarget } from "@/lib/payments/gateways";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { prisma } from "@/lib/prisma";

export async function confirmPendingCashfreeOrder(orderId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment || payment.gateway !== "cashfree") return payment;
  if (payment.status === "paid" || payment.status === "paid_unassigned") return payment;
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) return payment;

  const cashfree = cashfreeTarget();
  let body: { order_status?: string; order_amount?: number; customer_details?: { customer_phone?: string; customer_email?: string } };
  const headers = {
    "x-api-version": "2025-01-01",
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
  };
  try {
    const response = await fetch(`${cashfree.apiBase}/orders/${encodeURIComponent(orderId)}`, { headers });
    if (!response.ok) return payment;
    body = (await response.json()) as typeof body;
    const payments = await fetch(`${cashfree.apiBase}/orders/${encodeURIComponent(orderId)}/payments`, { headers });
    if (payments.ok) {
      const list = (await payments.json()) as Array<{ customer_details?: { customer_phone?: string; customer_email?: string } }>;
      const found = Array.isArray(list) ? list.find((item) => item.customer_details?.customer_phone || item.customer_details?.customer_email) : null;
      if (found?.customer_details) {
        body.customer_details = { ...body.customer_details, ...found.customer_details };
      }
    }
  } catch (error) {
    console.error(error);
    return payment;
  }
  const { saveBuyerContact } = await import("@/lib/leads");
  await saveBuyerContact({
    orderId,
    phone: body.customer_details?.customer_phone,
    email: body.customer_details?.customer_email,
    amountInr: body.order_amount != null ? Math.round(Number(body.order_amount)) : payment.amountInr,
  });

  const orderStatus = String(body.order_status || "").toUpperCase();
  if (orderStatus === "EXPIRED" || orderStatus === "CANCELLED" || orderStatus === "TERMINATED" || orderStatus === "FAILED") {
    await fulfillPayment("cashfree", {
      orderId,
      status: "failed",
      amountInr: body.order_amount != null ? Math.round(Number(body.order_amount)) : payment.amountInr,
      phone: body.customer_details?.customer_phone || payment.phone,
      email: body.customer_details?.customer_email || payment.email,
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
    email: body.customer_details?.customer_email || null,
    gatewayPaymentId: null,
    raw: body,
  });
  return prisma.payment.findUnique({ where: { id: orderId } });
}
