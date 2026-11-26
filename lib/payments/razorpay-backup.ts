import { audit } from "@/lib/admin/audit";
import { logEvent, paymentSource } from "@/lib/activity/log";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { prisma } from "@/lib/prisma";

/** Public Razorpay payment link for recovery emails only. Never shown on checkout. */
export const RAZORPAY_BACKUP_DEFAULT = "https://rzp.io/rzp/THEAITIMEMACHINE";

export function razorpayBackupUrl() {
  const raw = (process.env.RAZORPAY_BACKUP_URL || "").trim();
  if (/^https:\/\//i.test(raw)) return raw;
  return RAZORPAY_BACKUP_DEFAULT;
}

export function normalizeRazorpayPaymentId(value: unknown) {
  const id = String(value || "").trim();
  if (!id) return { ok: false as const, message: "Enter the Razorpay payment id (it usually starts with pay_)." };
  if (id.length < 6 || id.length > 64 || !/^[A-Za-z0-9_]+$/.test(id)) {
    return { ok: false as const, message: "That Razorpay payment id does not look right." };
  }
  return { ok: true as const, id };
}

export function normalizeOrderId(value: unknown) {
  const id = String(value || "").trim();
  if (!id) return { ok: false as const, message: "Enter the order id." };
  if (id.length > 80) return { ok: false as const, message: "That order id does not look right." };
  return { ok: true as const, id };
}

/**
 * Grant access for a buyer who paid the Razorpay backup link, same as a Cashfree payment.
 * Does not confirm the order as Cashfree and does not fire Google Ads / Meta purchase events.
 */
export async function markPaidViaRazorpay(input: { orderId: string; razorpayPaymentId: string; actor: string }) {
  const order = normalizeOrderId(input.orderId);
  if (!order.ok) return { ok: false as const, status: 400, message: order.message };
  const razorpay = normalizeRazorpayPaymentId(input.razorpayPaymentId);
  if (!razorpay.ok) return { ok: false as const, status: 400, message: razorpay.message };

  const payment = await prisma.payment.findUnique({ where: { id: order.id } });
  if (!payment) return { ok: false as const, status: 404, message: "That order was not found." };
  if (payment.isTest) return { ok: false as const, status: 409, message: "Test payments cannot be marked paid via Razorpay." };

  const alreadyPaid = payment.status === "paid" || payment.status === "paid_unassigned";
  if (alreadyPaid) {
    const sameRazorpay =
      payment.gateway === "razorpay" &&
      (payment.gatewayPaymentId === razorpay.id || payment.reference === razorpay.id);
    if (sameRazorpay) {
      return {
        ok: true as const,
        status: 200,
        message: "This order is already marked paid via Razorpay.",
        paymentId: payment.id,
        email: payment.email,
        duplicate: true,
      };
    }
    if (payment.gateway === "cashfree" && payment.gatewayConfirmedAt) {
      return { ok: false as const, status: 409, message: "This order is already confirmed as paid by Cashfree." };
    }
    return { ok: false as const, status: 409, message: `This order is already ${payment.status} (${payment.gateway}).` };
  }

  const previousGateway = payment.gateway;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gateway: "razorpay",
      method: "razorpay",
      reference: razorpay.id,
      gatewayPaymentId: razorpay.id,
      gatewayConfirmedAt: null,
      gatewayConfirmedVia: null,
      createdBy: payment.createdBy || input.actor,
      adminNote: [payment.adminNote, `Marked paid via Razorpay ${razorpay.id} by ${input.actor}`].filter(Boolean).join("\n"),
      raw: {
        ...((payment.raw && typeof payment.raw === "object" && !Array.isArray(payment.raw) ? payment.raw : {}) as Record<string, unknown>),
        source: "admin_razorpay",
        by: input.actor,
        razorpayPaymentId: razorpay.id,
        previousGateway,
      },
    },
  });

  const fulfilled = await fulfillPayment("razorpay", {
    orderId: payment.id,
    status: "paid",
    amountInr: payment.amountInr,
    currency: "INR",
    phone: payment.phone,
    email: payment.email,
    name: payment.name,
    gatewayPaymentId: razorpay.id,
    raw: { source: "admin_razorpay", by: input.actor, razorpayPaymentId: razorpay.id, previousGateway },
  });

  if (!fulfilled.ok) {
    return { ok: false as const, status: 409, message: "Could not grant access for this order." };
  }

  const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
  if (updated?.gatewayConfirmedAt) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayConfirmedAt: null, gatewayConfirmedVia: null },
    });
  }

  await audit(
    input.actor,
    "payment.razorpay",
    "payment",
    payment.id,
    `Marked paid via Razorpay ${razorpay.id}`,
    { razorpayPaymentId: razorpay.id, previousGateway, previousStatus: payment.status },
  );
  await logEvent({
    type: "payment.paid",
    email: updated?.email || payment.email,
    phone: updated?.phone || payment.phone,
    userId: updated?.userId || payment.userId,
    paymentId: payment.id,
    amountInr: payment.amountInr,
    source: paymentSource(payment),
    status: "paid",
    summary: `Marked paid via Razorpay ${razorpay.id} by ${input.actor}`,
    isTest: false,
    tag: "admin",
    dedupeKey: `payment.razorpay:${payment.id}`,
  });

  const email = updated?.email || payment.email;
  const message = email
    ? `Marked paid via Razorpay. Access granted and a sign-in code was sent to ${email}.`
    : "Marked paid via Razorpay, but there is no email on this order to send a sign-in code to.";
  return { ok: true as const, status: 200, message, paymentId: payment.id, email, userId: updated?.userId || null };
}
