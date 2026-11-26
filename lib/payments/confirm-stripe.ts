import { markStripeConfirmed } from "@/lib/payments/confirmed";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { getStripe } from "@/lib/payments/stripe-client";
import { prisma } from "@/lib/prisma";

/** If the buyer returns before the webhook, confirm a paid Stripe Checkout Session from Stripe itself. */
export async function confirmPendingStripeOrder(orderId: string, sessionId?: string | null) {
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment || payment.gateway !== "stripe") return payment;
  if (payment.isTest) return payment;
  if (payment.status === "paid" && payment.userId && payment.gatewayConfirmedAt) return payment;

  const stripe = getStripe();
  const id = (sessionId || payment.reference || "").trim();
  if (!stripe || !id.startsWith("cs_")) {
    if (payment.status === "paid" && payment.userId) return payment;
    return payment;
  }

  const session = await stripe.checkout.sessions.retrieve(id);
  const paid = session.payment_status === "paid";
  const amountUsdCents = session.amount_total != null ? session.amount_total : payment.amountUsdCents;
  const email = session.customer_details?.email || session.customer_email || payment.email;
  const name = session.customer_details?.name || payment.name;
  const phone = session.customer_details?.phone || payment.phone;
  const gatewayPaymentId = typeof session.payment_intent === "string" ? session.payment_intent : payment.gatewayPaymentId;

  if (!paid) return payment;

  await fulfillPayment("stripe", {
    orderId,
    status: "paid",
    amountInr: null,
    amountUsdCents,
    currency: (session.currency || "usd").toUpperCase(),
    phone,
    email,
    name,
    gatewayPaymentId,
    raw: { id: session.id, payment_status: session.payment_status, amount_total: session.amount_total },
  });
  await markStripeConfirmed(orderId, "api");
  return prisma.payment.findUnique({ where: { id: orderId } });
}
