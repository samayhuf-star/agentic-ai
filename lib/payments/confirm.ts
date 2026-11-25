import { markCashfreeConfirmed } from "@/lib/payments/confirmed";
import { fetchCashfreeOrder } from "@/lib/payments/cashfree-order";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { prisma } from "@/lib/prisma";

export async function confirmPendingCashfreeOrder(orderId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment || payment.gateway !== "cashfree") return payment;
  if (payment.isTest) return payment;
  if (payment.status === "paid" && payment.userId) return payment;

  const body = await fetchCashfreeOrder(orderId);
  if (!body) {
    if (payment.status === "paid" || payment.status === "paid_unassigned") {
      await fulfillPayment("cashfree", {
        orderId,
        status: "paid",
        amountInr: payment.amountInr,
        currency: "INR",
        phone: payment.phone,
        email: payment.email,
        name: payment.name,
        gatewayPaymentId: payment.gatewayPaymentId,
        raw: payment.raw,
      });
      return prisma.payment.findUnique({ where: { id: orderId } });
    }
    return payment;
  }

  const orderStatus = String(body.order_status || "").toUpperCase();
  const amountInr = body.order_amount != null ? Math.round(Number(body.order_amount)) : payment.amountInr;
  const phone = body.customer_details?.customer_phone || payment.phone;
  const email = body.customer_details?.customer_email || payment.email;
  const name = body.customer_details?.customer_name || payment.name;
  if (orderStatus === "EXPIRED" || orderStatus === "CANCELLED" || orderStatus === "TERMINATED" || orderStatus === "FAILED") {
    await fulfillPayment("cashfree", {
      orderId,
      status: "failed",
      amountInr,
      currency: String(body.order_currency || "INR").toUpperCase(),
      phone,
      email,
      name,
      gatewayPaymentId: null,
      raw: body,
    });
    return prisma.payment.findUnique({ where: { id: orderId } });
  }
  const cashfreePaid = orderStatus === "PAID";
  // Not paid at Cashfree and not paid here: nothing to do. (A row already paid here is re-fulfilled
  // as before, but only a PAID answer from Cashfree marks it as a confirmed sale.)
  if (!cashfreePaid && payment.status !== "paid" && payment.status !== "paid_unassigned") return payment;
  await fulfillPayment("cashfree", {
    orderId,
    status: "paid",
    amountInr,
    currency: String(body.order_currency || "INR").toUpperCase(),
    phone,
    email,
    name,
    gatewayPaymentId: null,
    raw: body,
  });
  if (cashfreePaid) await markCashfreeConfirmed(orderId, "api");
  return prisma.payment.findUnique({ where: { id: orderId } });
}
